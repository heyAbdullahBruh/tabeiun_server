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
    throw new Error("Invalid access token");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

// Only set refresh token in HTTP-only cookie
export const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/v1/auth/refresh-token", // Only sent to refresh endpoint
    // domain:
    //   process.env.NODE_ENV === "production"
    //     ? ".tabeiunmedicine.com"
    //     : undefined,
  });
};

// Clear refresh token cookie
export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/v1/auth/refresh-token",
    // domain:
    //   process.env.NODE_ENV === "production"
    //     ? ".tabeiunmedicine.com"
    //     : undefined,
  });
};

// Generate new access token from refresh token
export const generateAccessTokenFromRefresh = (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const { id, email, role } = decoded;

    return jwt.sign({ id, email, role }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
    });
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};
