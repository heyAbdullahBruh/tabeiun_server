// src/routes/publicAuth.routes.js
import { Router } from "express";
import {
  googleAuthCallback,
  facebookAuthCallback,
  userLogout,
  getCurrentUser,
  refreshUserToken,
  registerUser,
  loginUser,
  sendVerificationCode,
  verifyEmail,
  resendVerificationCode,
  sendPasswordResetCode,
  resetPasswordWithCode,
  changePassword,
  checkPasswordStatus,
} from "../controllers/publicAuth.controller.js";
import {
  authenticateUser,
  optionalAuth,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  userRegistrationValidator,
  userLoginValidator,
  sendVerificationCodeValidator,
  verifyEmailValidator,
  resendVerificationCodeValidator,
  sendPasswordResetCodeValidator,
  resetPasswordWithCodeValidator,
  changePasswordValidator,
} from "../validators/auth.validator.js";

const router = Router();

// ==========================================
// GOOGLE OAUTH
// ==========================================
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

// ==========================================
// FACEBOOK OAUTH
// ==========================================
router.get("/facebook", (req, res) => {
  const authUrl =
    `https://www.facebook.com/v12.0/dialog/oauth?` +
    `client_id=${process.env.FACEBOOK_APP_ID}&` +
    `redirect_uri=${process.env.FACEBOOK_CALLBACK_URL}&` +
    `scope=email,public_profile`;
  res.redirect(authUrl);
});
router.get("/facebook/callback", facebookAuthCallback);

// ==========================================
// EMAIL REGISTRATION & LOGIN
// ==========================================
router.post(
  "/user-registration",
  validate(userRegistrationValidator),
  registerUser,
);
router.post("/user-login", validate(userLoginValidator), loginUser);

// ==========================================
// EMAIL VERIFICATION
// ==========================================
router.post(
  "/send-verification-code",
  optionalAuth,
  validate(sendVerificationCodeValidator),
  sendVerificationCode,
);
router.post(
  "/verify-email",
  optionalAuth,
  validate(verifyEmailValidator),
  verifyEmail,
);
router.post(
  "/resend-verification-code",
  optionalAuth,
  validate(resendVerificationCodeValidator),
  resendVerificationCode,
);

// ==========================================
// PASSWORD MANAGEMENT
// ==========================================
router.post(
  "/send-password-reset-code",
  validate(sendPasswordResetCodeValidator),
  sendPasswordResetCode,
);
router.post(
  "/reset-password-with-code",
  validate(resetPasswordWithCodeValidator),
  resetPasswordWithCode,
);
router.post(
  "/change-password",
  authenticateUser,
  validate(changePasswordValidator),
  changePassword,
);
router.get("/password-status", authenticateUser, checkPasswordStatus);

// ==========================================
// TOKEN & SESSION
// ==========================================
router.post("/user-refresh-token", refreshUserToken);
router.get("/user-logout", authenticateUser, userLogout);
router.get("/user-me", authenticateUser, getCurrentUser);

export default router;
