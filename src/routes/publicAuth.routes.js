import { Router } from "express";
import passport from "passport";
import {
  googleAuthCallback,
  facebookAuthCallback,
  userLogout,
  getCurrentUser,
  refreshUserToken,
} from "../controllers/publicAuth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

// Google OAuth routes
router.get("/google", (req, res) => {
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&` +
    `response_type=code&` +
    `scope=profile email&` +
    `access_type=offline`;

  res.redirect(authUrl);
});

router.get("/google/callback", googleAuthCallback);

// Facebook OAuth routes
router.get("/facebook", (req, res) => {
  const authUrl =
    `https://www.facebook.com/v12.0/dialog/oauth?` +
    `client_id=${process.env.FACEBOOK_APP_ID}&` +
    `redirect_uri=${process.env.FACEBOOK_CALLBACK_URL}&` +
    `scope=email,public_profile`;

  res.redirect(authUrl);
});

router.get("/facebook/callback", facebookAuthCallback);

// Token refresh
router.post("/refresh-token", refreshUserToken);

// Protected routes
router.get("/logout", authenticateUser, userLogout);
router.get("/me", authenticateUser, getCurrentUser);

export default router;
