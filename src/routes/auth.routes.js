import { Router } from "express";
import {
  adminLogin,
  adminLogout,
  refreshToken,
  getCurrentAdmin,
} from "../controllers/auth.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { adminLoginValidator } from "../validators/auth.validator.js";
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

// Protected routes
router.post("/logout", authenticateAdmin, adminLogout);
router.get("/me", authenticateAdmin, getCurrentAdmin);

export default router;
