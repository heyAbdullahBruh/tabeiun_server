import Admin from "../models/Admin.model.js";
import { errorResponse } from "../utils/responseFormatter.js";
import User from "../models/User.model.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";

//authenticateAdmin
export const authenticateAdmin = async (req, res, next) => {
  try {
    // Get access token from Authorization header only
    let token = null;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Access token required", 401);
    }

    // Verify access token
    const decoded = verifyAccessToken(token);

    // Check if admin exists and is active
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin || !admin.isActive) {
      return errorResponse(res, "Activation error", 401);
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Access token expired", 401);
    }
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid access token", 401);
    }
    return errorResponse(res, "Authentication failed", 500);
  }
};

// Updated authenticateUser
export const authenticateUser = async (req, res, next) => {
  try {
    // Get access token from Authorization header only
    let token = null;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Access token required", 401);
    }

    // Verify access token
    const decoded = verifyAccessToken(token);

    // Check if user exists and is not blocked
    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      return errorResponse(res, "User not found or blocked", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Access token expired", 401);
    }
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid access token", 401);
    }
    return errorResponse(res, "Authentication failed", 500);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    // Try to get token from header
    let token = null;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // If token exists and is valid, get user
    if (token) {
      try {
        console.log("Optional auth - token found:", token);
        const decoded = verifyAccessToken(token);
        console.log(decoded);

        const user = await User.findById(decoded.id);
        console.log("Optional auth - user found:", user ? user._id : "none");
        if (user && !user.isBlocked) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid - continue as guest
      }
    } else {
      // Always get sessionId from header (for guests)
      const sessionId = req.headers["X-Session-Id"];
      console.log("Optional auth - sessionId:", sessionId);
      if (sessionId) {
        req.sessionId = sessionId;
      }
    }
    next();
  } catch (error) {
    next();
  }
};
