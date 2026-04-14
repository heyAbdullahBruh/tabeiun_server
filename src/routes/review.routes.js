import { Router } from "express";
import multer from "multer";
import {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  adminGetAllReviews,
  adminApproveReview,
  adminDeleteReview,
  canReviewProduct,
  voteHelpfulReview,
  hasAlreadyReviewed,
  getReviewableProducts,
} from "../controllers/review.controller.js";
import {
  authenticateUser,
  authenticateAdmin,
} from "../middlewares/auth.middleware.js";
import { isAdminOrModerator } from "../middlewares/role.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const router = Router();

// Public routes
router.get("/product/:productId", getProductReviews);

// User authenticated routes
router.get("/reviewable-products", authenticateUser, getReviewableProducts);
router.get("/can-review/:productId", authenticateUser, canReviewProduct);
router.get("/has-reviewed/:productId", authenticateUser, hasAlreadyReviewed);
router.post("/create", authenticateUser, upload.single("image"), createReview);
router.post("/vote-helpful/:reviewId", authenticateUser, voteHelpfulReview);
router.get("/my-reviews", authenticateUser, getUserReviews);
router.put(
  "/:reviewId",
  authenticateUser,
  upload.single("image"),
  updateReview,
);
router.delete("/:reviewId", authenticateUser, deleteReview);

// Admin routes
router.get(
  "/admin/all",
  authenticateAdmin,
  isAdminOrModerator,
  adminGetAllReviews,
);
router.patch(
  "/admin/:reviewId/approve",
  authenticateAdmin,
  isAdminOrModerator,
  adminApproveReview,
);
router.delete(
  "/admin/:reviewId",
  authenticateAdmin,
  isAdminOrModerator,
  adminDeleteReview,
);

export default router;
