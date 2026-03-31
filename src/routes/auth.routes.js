import { Router } from "express";
import {
  adminLogin,
  adminLogout,
  refreshToken,
  getCurrentAdmin,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  adminLoginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} from "../validators/auth.validator.js";
import { authRateLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Public routes
router.post(
  "/login",
  authRateLimiter,
  validate(adminLoginValidator),
  adminLogin,
);
router.post("/refresh-token", refreshToken);
router.post(
  "/forgot-password",
  validate(forgotPasswordValidator),
  forgotPassword,
);
router.post("/reset-password", validate(resetPasswordValidator), resetPassword);

// Protected routes
router.post("/logout", authenticateAdmin, adminLogout);
router.get("/me", authenticateAdmin, getCurrentAdmin);
router.post(
  "/change-password",
  authenticateAdmin,
  validate(changePasswordValidator),
  changePassword,
);

export default router;
