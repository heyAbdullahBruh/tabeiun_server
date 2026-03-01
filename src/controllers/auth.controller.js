import bcrypt from "bcrypt";
import Admin from "../models/Admin.model.js";
import User from "../models/User.model.js";
import {
  generateTokens,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
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
    await admin.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    // Save refresh token
    admin.refreshToken = refreshToken;
    await admin.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "LOGIN",
      targetModel: "Admin",
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      {
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

// Admin Logout
export const adminLogout = async (req, res) => {
  try {
    const admin = req.admin;

    // Clear refresh token
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

    // Clear cookies
    clearTokenCookies(res);

    return successResponse(res, null, "Logout successful");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Refresh Token
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

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
      return errorResponse(res, "Invalid refresh token", 401);
    }

    // Generate new tokens
    const tokens = generateTokens({
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    // Update refresh token
    admin.refreshToken = tokens.refreshToken;
    await admin.save();

    // Set new cookies
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return successResponse(
      res,
      {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
      "Token refreshed",
    );
  } catch (error) {
    clearTokenCookies(res);
    return errorResponse(res, "Invalid refresh token", 401);
  }
};

// Get Current Admin
export const getCurrentAdmin = async (req, res) => {
  try {
    return successResponse(res, { admin: req.admin });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
