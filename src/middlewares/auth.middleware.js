import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model.js";
import { errorResponse } from "../utils/responseFormatter.js";
import User from "../models/User.model.js";

export const authenticateAdmin = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Authentication required", 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Check if admin exists and is active
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin || !admin.isActive) {
      return errorResponse(res, "Admin not found or inactive", 401);
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Token expired", 401);
    }
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid token", 401);
    }
    return errorResponse(res, "Authentication failed", 500);
  }
};

export const authenticateUser = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Authentication required", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Check if user exists and is not blocked
    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      return errorResponse(res, "User not found or blocked", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Token expired", 401);
    }
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid token", 401);
    }
    return errorResponse(res, "Authentication failed", 500);
  }
};
