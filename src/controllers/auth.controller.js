import bcrypt from "bcrypt";
import Admin from "../models/Admin.model.js";
import User from "../models/User.model.js";
import {
  generateTokens,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  generateAccessTokenFromRefresh,
} from "../utils/jwt.utils.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";

// Admin Login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    // Check if active
    if (!admin.isActive) {
      return errorResponse(res, "Account is deactivated", 403);
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
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
      actionType: 'LOGOUT',
      targetModel: 'Admin',
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// userLogout
export const userLogout = async (req, res) => {
  try {
    // Clear refresh token cookie
    clearRefreshTokenCookie(res);
    
    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// refreshToken
export const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie only
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token required', 401);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find admin with this refresh token
    const admin = await Admin.findOne({ 
      _id: decoded.id, 
      refreshToken,
      isActive: true 
    });

    if (!admin) {
      // Clear invalid refresh token cookie
      clearRefreshTokenCookie(res);
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    // Generate new access token only
    const newAccessToken = generateAccessTokenFromRefresh(refreshToken);

    // Optionally implement token rotation - issue new refresh token
    // This is more secure but requires updating the database
    if (shouldRotateRefreshToken()) {
      const { refreshToken: newRefreshToken } = generateTokens({
        id: admin._id,
        email: admin.email,
        role: admin.role
      });

      admin.refreshToken = newRefreshToken;
      await admin.save();

      // Set new refresh token cookie
      setRefreshTokenCookie(res, newRefreshToken);
    }

    return successResponse(res, {
      accessToken: newAccessToken
    }, 'Token refreshed');
  } catch (error) {
    clearRefreshTokenCookie(res);
    return errorResponse(res, 'Invalid refresh token', 401);
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
