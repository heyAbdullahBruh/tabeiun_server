import Admin from "../models/Admin.model.js";
import {
  generateTokens,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  generateAccessTokenFromRefresh,
} from "../utils/jwt.utils.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import emailService from "../services/EmailService.js";

// Admin Login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return errorResponse(res, "Invalid credentials", 401);
    }
    console.log(admin);
    // Check if active
    if (!admin.isActive) {
      return errorResponse(res, "Account is deactivated", 403);
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    console.log("Password validation result:", isPasswordValid);
    console.log(
      "bcrypt.compareSync(password, admin.password)",
      bcrypt.compareSync(password, admin.password),
    );

    if (!bcrypt.compareSync(password, admin.password)) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    // Update last login
    admin.lastLogin = new Date();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    // Save refresh token in database
    admin.refreshToken = refreshToken;
    await admin.save();

    // Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "LOGIN",
      targetModel: "Admin",
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Send access token in response body
    return successResponse(
      res,
      {
        accessToken,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
      "Login successful",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// adminLogout
export const adminLogout = async (req, res) => {
  try {
    const admin = req.admin;

    // Clear refresh token from database
    admin.refreshToken = null;
    await admin.save();

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "LOGOUT",
      targetModel: "Admin",
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    return successResponse(res, null, "Logout successful");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// userLogout
export const userLogout = async (req, res) => {
  try {
    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    return successResponse(res, null, "Logout successful");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// refreshToken
export const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie only
    const refreshToken = req.cookies?.refreshToken;
    console.log("Received refresh token:", refreshToken);
    if (!refreshToken) {
      return errorResponse(res, "Refresh token required", 401);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find admin with this refresh token
    const admin = await Admin.findOne({
      _id: decoded.id,
      refreshToken,
      isActive: true,
    });

    if (!admin) {
      // Clear invalid refresh token cookie
      clearRefreshTokenCookie(res);
      return errorResponse(res, "Invalid refresh token", 401);
    }

    // Generate new access token only
    const newAccessToken = generateAccessTokenFromRefresh(refreshToken);

    // Optionally implement token rotation - issue new refresh token
    // This is more secure but requires updating the database
    if (shouldRotateRefreshToken()) {
      const { refreshToken: newRefreshToken } = generateTokens({
        id: admin._id,
        email: admin.email,
        role: admin.role,
      });

      admin.refreshToken = newRefreshToken;
      await admin.save();

      // Set new refresh token cookie
      setRefreshTokenCookie(res, newRefreshToken);
    }

    return successResponse(
      res,
      {
        accessToken: newAccessToken,
      },
      "Token refreshed",
    );
  } catch (error) {
    clearRefreshTokenCookie(res);
    return errorResponse(res, "Invalid refresh token", 401);
  }
};

// Helper to decide if refresh token should be rotated
const shouldRotateRefreshToken = () => {
  // Implement logic: maybe rotate every 3 days or on suspicious activity
  return Math.random() < 0.1; // 10% chance for demo - adjust as needed
};

// Get Current Admin
export const getCurrentAdmin = async (req, res) => {
  try {
    return successResponse(res, { admin: req.admin });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Forgot Password - Send Reset Link
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Email is required", 400);
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      // For security, don't reveal if email exists or not
      return successResponse(
        res,
        null,
        "If your email is registered, you will receive a password reset link",
      );
    }

    // Check if admin is active
    if (!admin.isActive) {
      return errorResponse(
        res,
        "Account is deactivated. Please contact support.",
        403,
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expiry (1 hour from now)
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save to database
    admin.resetPasswordToken = resetTokenHash;
    admin.resetPasswordExpiry = resetTokenExpiry;
    await admin.save();

    // Create reset URL
    const resetUrl = `${process.env.DASHBOARD_URL}/reset-password/${resetToken}`;

    // Send email with reset link
    await emailService.sendPasswordResetEmail(admin, resetUrl);

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "FORGOT_PASSWORD",
      targetModel: "Admin",
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, null, "Password reset link sent to your email");
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse(res, error.message);
  }
};

// Reset Password - Set New Password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return errorResponse(res, "Token and password are required", 400);
    }

    if (password.length < 8) {
      return errorResponse(res, "Password must be at least 8 characters", 400);
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find admin with valid token
    const admin = await Admin.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpiry: { $gt: Date.now() },
      isActive: true,
    });

    if (!admin) {
      return errorResponse(res, "Invalid or expired reset token", 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    );
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset fields
    admin.password = hashedPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpiry = undefined;
    admin.refreshToken = undefined; // Clear refresh token to force re-login

    await admin.save();

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "RESET_PASSWORD",
      targetModel: "Admin",
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Send confirmation email
    await emailService.sendPasswordResetConfirmationEmail(admin);

    return successResponse(
      res,
      null,
      "Password reset successfully. Please login with your new password.",
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse(res, error.message);
  }
};

// Change Password (Authenticated)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin._id;

    if (!currentPassword || !newPassword) {
      return errorResponse(
        res,
        "Current password and new password are required",
        400,
      );
    }

    if (newPassword.length < 8) {
      return errorResponse(
        res,
        "New password must be at least 8 characters",
        400,
      );
    }

    if (currentPassword === newPassword) {
      return errorResponse(
        res,
        "New password must be different from current password",
        400,
      );
    }

    const admin = await Admin.findById(adminId).select("+password");
    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Verify current password
    const isPasswordValid = await admin.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return errorResponse(res, "Current password is incorrect", 401);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    );
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear refresh token
    admin.password = hashedPassword;
    admin.refreshToken = undefined;
    await admin.save();

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "CHANGE_PASSWORD",
      targetModel: "Admin",
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Clear cookies to force re-login
    clearRefreshTokenCookie(res);

    return successResponse(
      res,
      null,
      "Password changed successfully. Please login again.",
    );
  } catch (error) {
    console.error("Change password error:", error);
    return errorResponse(res, error.message);
  }
};
