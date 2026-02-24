import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Middleware for Admin Dashboard (Admin & Moderator)
export const verifyAdminJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token)
      return res
        .status(401)
        .json(new ApiResponse(401, null, "Unauthorized request"));

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const admin = await Admin.findById(decodedToken?._id).select("-password");

    if (!admin || !admin.isActive) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            null,
            "Invalid Access Token or Account Disabled",
          ),
        );
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, null, error?.message || "Invalid access token"),
      );
  }
};

// Middleware for Public Site (Social Media Auth Users)
export const verifyUserJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.userAccessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token)
      return res
        .status(401)
        .json(new ApiResponse(401, null, "Please login to continue"));

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user || user.isBlocked) {
      return res
        .status(401)
        .json(new ApiResponse(401, null, "User not found or blocked"));
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Session expired, please login again"));
  }
};

// RBAC Middleware (Role Based Access Control)
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res
        .status(403)
        .json(
          new ApiResponse(
            403,
            null,
            `Role: ${req.admin.role} is not allowed to access this resource`,
          ),
        );
    }
    next();
  };
};
