import { Admin } from "../models/admin.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  generateAccessToken,
  generateRefreshToken,
  cookieOptions,
} from "../utils/jwt.util.js";

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Email and password are required"));
  }

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin || !(await admin.comparePassword(password))) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Invalid credentials"));
  }

  const accessToken = generateAccessToken({ _id: admin._id, role: admin.role });
  const refreshToken = generateRefreshToken({ _id: admin._id });

  // Update last login
  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          admin: { name: admin.name, email: admin.email, role: admin.role },
          accessToken,
        },
        "Login successful",
      ),
    );
};

export const logoutAdmin = async (req, res) => {
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
};
