import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error("Invalid access");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid refresh");
  }
};

export const setTokenCookies = (res, accessToken, refreshToken) => {
  // Access token cookie - short lived, httpOnly
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
    domain:
      process.env.NODE_ENV === "production"
        ? ".tabeiunmedicine.com"
        : undefined,
  });

  // Refresh token cookie - longer lived, httpOnly
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain:
      process.env.NODE_ENV === "production"
        ? ".tabeiunmedicine.com"
        : undefined,
  });
};

export const clearTokenCookies = (res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain:
      process.env.NODE_ENV === "production"
        ? ".tabeiunmedicine.com"
        : undefined,
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain:
      process.env.NODE_ENV === "production"
        ? ".tabeiunmedicine.com"
        : undefined,
  });
};
