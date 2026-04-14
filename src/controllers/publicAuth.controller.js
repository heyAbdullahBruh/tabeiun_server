// src/controllers/publicAuth.controller.js
import User from "../models/User.model.js";
import {
  generateTokens,
  verifyRefreshToken,
  clearRefreshTokenCookie,
  generateAccessTokenFromRefresh,
  setRefreshTokenCookie,
} from "../utils/jwt.utils.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import emailService from "../services/EmailService.js";
import axios from "axios";
import bcrypt from "bcrypt";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==========================================
// GOOGLE OAUTH
// ==========================================

export const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      },
    );

    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const { id, email, name, picture } = userResponse.data;

    let user = await User.findOne({
      $or: [{ provider: "google", providerId: id }, { email }],
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        provider: "google",
        providerId: id,
        avatar: picture,
        isEmailVerified: true, // Google emails are verified
        hasSetPassword: false, // OAuth users start without password
      });

      await emailService.sendWelcomeEmail(user);
    } else if (user.provider !== "google") {
      user.provider = "google";
      user.providerId = id;
      await user.save();
    }

    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    setRefreshTokenCookie(res, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      hasSetPassword: user.hasSetPassword,
    };

    const encodedUserData = encodeURIComponent(JSON.stringify(userData));

    const frontendUrl = process.env.PUBLIC_URL;
    return res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&user=${encodedUserData}`,
    );
  } catch (error) {
    console.error("Google auth error:", error);
    return res.redirect(
      `${process.env.PUBLIC_URL}/auth/callback?success=false&message=Authentication failed`,
    );
  }
};

// ==========================================
// FACEBOOK OAUTH
// ==========================================

export const facebookAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    const tokenResponse = await axios.get(
      "https://graph.facebook.com/v12.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
          code,
        },
      },
    );

    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,name,email,picture",
        access_token,
      },
    });

    const { id, name, email, picture } = userResponse.data;

    let user = await User.findOne({
      $or: [{ provider: "facebook", providerId: id }, { email }],
    });

    if (!user) {
      user = await User.create({
        name,
        email: email || `${id}@facebook.com`,
        provider: "facebook",
        providerId: id,
        avatar: picture?.data?.url,
        isEmailVerified: true, // Facebook emails are verified
        hasSetPassword: false, // OAuth users start without password
      });

      await emailService.sendWelcomeEmail(user);
    } else if (user.provider !== "facebook") {
      user.provider = "facebook";
      user.providerId = id;
      await user.save();
    }

    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    setRefreshTokenCookie(res, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      hasSetPassword: user.hasSetPassword,
    };

    const encodedUserData = encodeURIComponent(JSON.stringify(userData));

    const frontendUrl = process.env.PUBLIC_URL;
    return res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&user=${encodedUserData}`,
    );
  } catch (error) {
    console.error("Facebook auth error:", error);
    return res.redirect(
      `${process.env.PUBLIC_URL}/auth/callback?success=false&message=Authentication failed`,
    );
  }
};

// ==========================================
// EMAIL REGISTRATION
// ==========================================

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, "User with this email already exists", 400);
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password,
      provider: "email",
      phone: phone || "",
      isEmailVerified: false,
      hasSetPassword: true,
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry,
    });

    emailService
      .sendEmailVerificationCode(user, verificationCode)
      .catch((err) => {
        console.error("Failed to send verification email:", err);
      });

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    setRefreshTokenCookie(res, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: false,
      hasSetPassword: true,
    };

    return successResponse(
      res,
      {
        accessToken,
        user: userData,
        message:
          "Registration successful. Please verify your email with the code sent to your inbox.",
      },
      "Registration successful",
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return errorResponse(res, error.message);
  }
};

// ==========================================
// EMAIL LOGIN
// ==========================================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    if (user.isBlocked) {
      return errorResponse(
        res,
        "Your account has been blocked. Please contact support.",
        403,
      );
    }

    if (user.provider !== "email") {
      return errorResponse(res, `Please login with ${user.provider}`, 400);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    setRefreshTokenCookie(res, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      hasSetPassword: user.hasSetPassword,
      phone: user.phone,
      address: user.address,
    };

    return successResponse(
      res,
      {
        accessToken,
        user: userData,
        isEmailVerified: user.isEmailVerified,
      },
      "Login successful",
    );
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, error.message);
  }
};

// ==========================================
// EMAIL VERIFICATION
// ==========================================

export const sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user?._id;

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.isEmailVerified) {
      return errorResponse(res, "Email already verified", 400);
    }

    const lastRequest = user.lastVerificationRequest;
    if (lastRequest && Date.now() - lastRequest < 60000) {
      return errorResponse(
        res,
        "Please wait 60 seconds before requesting another code",
        429,
      );
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpiry = verificationExpiry;
    user.lastVerificationRequest = Date.now();
    await user.save();

    await emailService.sendEmailVerificationCode(user, verificationCode);

    return successResponse(
      res,
      {
        email: user.email,
        expiresIn: 10,
      },
      "Verification code sent to your email",
    );
  } catch (error) {
    console.error("Send verification code error:", error);
    return errorResponse(res, error.message);
  }
};

// Note: The verifyEmail function is used for both initial verification and resending code, so it checks both req.user and email in the body to find the user. This allows it to work seamlessly in both scenarios.
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const userId = req.user?._id;

    let user;
    if (userId) {
      user = await User.findById(userId).select(
        "+emailVerificationCode +emailVerificationExpiry",
      );
    } else if (email) {
      user = await User.findOne({ email }).select(
        "+emailVerificationCode +emailVerificationExpiry",
      );
    }

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.isEmailVerified) {
      return errorResponse(res, "Email already verified", 400);
    }

    if (user.emailVerificationCode !== code) {
      return errorResponse(res, "Invalid verification code", 400);
    }

    if (user.emailVerificationExpiry < new Date()) {
      return errorResponse(
        res,
        "Verification code expired. Please request a new one.",
        400,
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiry = undefined;
    user.lastVerificationRequest = undefined;
    await user.save();

    await emailService.sendEmailVerificationSuccess(user);

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    setRefreshTokenCookie(res, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: true,
      hasSetPassword: user.hasSetPassword,
    };

    return successResponse(
      res,
      {
        accessToken,
        user: userData,
      },
      "Email verified successfully",
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return errorResponse(res, error.message);
  }
};

//=========================================
// RESEND VERIFICATION CODE
//=========================================
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user?._id;

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.isEmailVerified) {
      return errorResponse(res, "Email already verified", 400);
    }

    const lastRequest = user.lastVerificationRequest;
    if (lastRequest && Date.now() - lastRequest < 60000) {
      return errorResponse(
        res,
        "Please wait 60 seconds before requesting another code",
        429,
      );
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpiry = verificationExpiry;
    user.lastVerificationRequest = Date.now();
    await user.save();

    await emailService.sendEmailVerificationCode(user, verificationCode);

    return successResponse(
      res,
      {
        email: user.email,
        expiresIn: 10,
      },
      "New verification code sent to your email",
    );
  } catch (error) {
    console.error("Resend verification code error:", error);
    return errorResponse(res, error.message);
  }
};

// ==========================================
// PASSWORD MANAGEMENT
// ==========================================

export const sendPasswordResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Email is required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      return successResponse(
        res,
        null,
        "If your email is registered, you will receive a password reset code",
      );
    }

    if (user.provider !== "email" && !user.hasSetPassword) {
      return errorResponse(
        res,
        "This account uses Google/Facebook login. Please login with Google/Facebook and set a password in your profile settings first.",
        400,
      );
    }

    const lastRequest = user.lastPasswordResetRequest;
    if (lastRequest && Date.now() - lastRequest < 60000) {
      return errorResponse(
        res,
        "Please wait 60 seconds before requesting another reset code",
        429,
      );
    }

    const resetCode = generateResetCode();
    const resetExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordCode = resetCode;
    user.resetPasswordExpiry = resetExpiry;
    user.lastPasswordResetRequest = Date.now();
    await user.save();

    await emailService.sendPasswordResetCodeEmail(user, resetCode);

    return successResponse(
      res,
      {
        email: user.email,
        expiresIn: 10,
      },
      "Password reset code sent to your email",
    );
  } catch (error) {
    console.error("Send password reset code error:", error);
    return errorResponse(res, error.message);
  }
};

export const resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({ email }).select(
      "+resetPasswordCode +resetPasswordExpiry",
    );

    if (!user) {
      return errorResponse(res, "Invalid request", 400);
    }

    if (user.provider !== "email" && !user.hasSetPassword) {
      return errorResponse(
        res,
        "This account uses Google/Facebook login. Please login with Google/Facebook and set a password in your profile first.",
        400,
      );
    }

    if (user.resetPasswordCode !== code) {
      return errorResponse(res, "Invalid verification code", 400);
    }

    if (user.resetPasswordExpiry < new Date()) {
      return errorResponse(
        res,
        "Verification code expired. Please request a new one.",
        400,
      );
    }

    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    );
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.hasSetPassword = true;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpiry = undefined;
    user.lastPasswordResetRequest = undefined;
    await user.save();

    await emailService.sendPasswordResetConfirmationEmail(user);

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    setRefreshTokenCookie(res, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      hasSetPassword: user.hasSetPassword,
    };

    return successResponse(
      res,
      {
        accessToken,
        user: userData,
      },
      "Password reset successful",
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse(res, error.message);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).select("+password");
    console.log("User found for password change:", {
      user,
      userId,
      currentPassword,
      newPassword,
    });
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.hasSetPassword && user.password) {
      if (!currentPassword) {
        return errorResponse(
          res,
          "Current password is required to change password",
          400,
        );
      }

      const isPasswordValid = await user.comparePassword(currentPassword);
      console.log("Current password valid:", isPasswordValid);
      if (!isPasswordValid) {
        return errorResponse(res, "Current password is incorrect", 300);
      }

      if (currentPassword === newPassword) {
        return errorResponse(
          res,
          "New password must be different from current password",
          400,
        );
      }
    }

    user.password = newPassword;
    user.hasSetPassword = true;
    await user.save();

    await emailService.sendPasswordChangeConfirmationEmail(user);

    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    setRefreshTokenCookie(res, refreshToken);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      hasSetPassword: user.hasSetPassword,
    };

    return successResponse(
      res,
      {
        accessToken,
        user: userData,
      },
      "Password changed successfully",
    );
  } catch (error) {
    console.error("Change password error:", error);
    return errorResponse(res, error.message);
  }
};

export const checkPasswordStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "hasSetPassword provider isEmailVerified",
    );

    return successResponse(
      res,
      {
        hasSetPassword: user.hasSetPassword,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified,
        canSetPassword: user.provider !== "email" || !user.hasSetPassword,
        canChangePassword: user.hasSetPassword,
        canResetPassword: user.provider === "email" || user.hasSetPassword,
      },
      "Password status fetched",
    );
  } catch (error) {
    console.error("Check password status error:", error);
    return errorResponse(res, error.message);
  }
};

// ==========================================
// SESSION MANAGEMENT
// ==========================================

export const userLogout = async (req, res) => {
  try {
    clearRefreshTokenCookie(res);
    return successResponse(res, null, "Logout successful");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-__v");
    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const shouldRotateRefreshToken = () => {
  return Math.random() < 0.1; // 10% chance for demo - adjust as needed
};

export const refreshUserToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return errorResponse(res, "Refresh token required", 401);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      clearRefreshTokenCookie(res);
      return errorResponse(res, "User not found or blocked", 401);
    }

    const newAccessToken = generateAccessTokenFromRefresh(refreshToken);
    if (shouldRotateRefreshToken()) {
      const { refreshToken: newRefreshToken } = generateTokens({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      // Set new refresh token cookie
      setRefreshTokenCookie(res, newRefreshToken);
    }
    return successResponse(
      res,
      {
        accessToken: newAccessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          hasSetPassword: user.hasSetPassword,
        },
      },
      "Token refreshed",
    );
  } catch (error) {
    clearRefreshTokenCookie(res);
    return errorResponse(res, "Invalid refresh token", 401);
  }
};
