// src/routes/user.routes.js - WITH VALIDATORS
import { Router } from "express";
import multer from "multer";
import {
  updateUserProfile,
  updateUserAvatar,
  getUserOrderSummary,
  getUserAddresses,
  updateAddress,
  getAllUsers,
  getUserById,
  toggleUserBlock,
} from "../controllers/user.controller.js";
import {
  authenticateUser,
  authenticateAdmin,
} from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  updateProfileValidator,
  addressValidator,
  userIdValidator,
} from "../validators/user.validator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
});

const router = Router();

// ==========================================
// USER ROUTES (Authenticated)
// ==========================================

// Update user profile
router.patch(
  "/profile",
  authenticateUser,
  validate(updateProfileValidator),
  updateUserProfile,
);

// Update user avatar
router.patch(
  "/avatar",
  authenticateUser,
  upload.single("avatar"),
  updateUserAvatar,
);

// Get user order summary
router.get("/orders/summary", authenticateUser, getUserOrderSummary);

// Get user addresses
router.get("/addresses", authenticateUser, getUserAddresses);

// Update user address
router.put(
  "/addresses",
  authenticateUser,
  validate(addressValidator),
  updateAddress,
);

// ==========================================
// ADMIN ROUTES (Admin only)
// ==========================================

// Get all users (admin only)
router.get("/admin/all", authenticateAdmin, isAdmin, getAllUsers);

// Get single user by ID (admin only)
router.get(
  "/admin/:userId",
  authenticateAdmin,
  isAdmin,
  validate(userIdValidator),
  getUserById,
);

// Toggle user block status (admin only)
router.patch(
  "/admin/:userId/toggle-block",
  authenticateAdmin,
  isAdmin,
  validate(userIdValidator),
  toggleUserBlock,
);

export default router;
