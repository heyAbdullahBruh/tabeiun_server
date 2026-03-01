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

// Google OAuth callback
export const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { id, email, name, picture } = userResponse.data;

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { provider: 'google', providerId: id },
        { email }
      ]
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        provider: 'google',
        providerId: id,
        avatar: picture
      });

      // Send welcome email
      await emailService.sendWelcomeEmail(user);
    } else if (user.provider !== 'google') {
      // Update provider info if user exists with different provider
      user.provider = 'google';
      user.providerId = id;
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role
    });

    // Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Redirect to frontend with access token in URL fragment
    // Using fragment so it's not sent to server
    const frontendUrl = process.env.PUBLIC_URL;
    return res.redirect(`${frontendUrl}/auth/callback#accessToken=${accessToken}`);
  } catch (error) {
    console.error('Google auth error:', error);
    return res.redirect(`${process.env.PUBLIC_URL}/auth/callback?success=false&message=Authentication failed`);
  }
};

// Facebook OAuth callback
export const facebookAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    // Exchange code for access token
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

    // Get user info from Facebook
    const userResponse = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,name,email,picture",
        access_token,
      },
    });

    const { id, name, email, picture } = userResponse.data;

    // Find or create user
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
      });

      // Send welcome email
      await emailService.sendWelcomeEmail(user);
    } else if (user.provider !== "facebook") {
      user.provider = "facebook";
      user.providerId = id;
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);
    const frontendUrl = process.env.PUBLIC_URL;
    return res.redirect(`${frontendUrl}/auth/callback#accessToken=${accessToken}`);
  } catch (error) {
    console.error("Facebook auth error:", error);
    return res.redirect(
      `${process.env.PUBLIC_URL}/auth/callback?success=false&message=Authentication failed`,
    );
  }
};

// User Logout
export const userLogout = async (req, res) => {
  try {
    clearRefreshTokenCookie(res);
    return successResponse(res, null, "Logout successful");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Current User
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-__v");
    return successResponse(res, { user });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// refreshUserToken
export const refreshUserToken = async (req, res) => {
  try {
    // Get refresh token from cookie only
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token required', 401);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      clearRefreshTokenCookie(res);
      return errorResponse(res, 'User not found or blocked', 401);
    }

    // Generate new access token only
    const newAccessToken = generateAccessTokenFromRefresh(refreshToken);

    return successResponse(res, {
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    }, 'Token refreshed');
  } catch (error) {
    clearRefreshTokenCookie(res);
    return errorResponse(res, 'Invalid refresh token', 401);
  }
};
