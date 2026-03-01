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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
});

const router = Router();

// User routes (authenticated)
router.patch("/profile", authenticateUser, updateUserProfile);
router.patch(
  "/avatar",
  authenticateUser,
  upload.single("avatar"),
  updateUserAvatar,
);
router.get("/orders/summary", authenticateUser, getUserOrderSummary);
router.get("/addresses", authenticateUser, getUserAddresses);
router.put("/addresses", authenticateUser, updateAddress);

// Admin routes
router.get("/admin/all", authenticateAdmin, isAdmin, getAllUsers);
router.get("/admin/:userId", authenticateAdmin, isAdmin, getUserById);
router.patch(
  "/admin/:userId/toggle-block",
  authenticateAdmin,
  isAdmin,
  toggleUserBlock,
);

export default router;
