import Review from "../models/Review.model.js";
import reviewService from "../services/reviewService.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

// has already reviewed by this user
export const hasAlreadyReviewed = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const alreadyReviewed = await reviewService.hasAlreadyReviewed(
      userId,
      productId,
    );

    return successResponse(
      res,
      { alreadyReviewed },
      alreadyReviewed
        ? "You have already reviewed this product for your order."
        : "You have not reviewed this product for your order.",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Check if user can review a product
export const canReviewProduct = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const canReview = await reviewService.isThisProductReadyForReviewByUser(
      userId,
      productId,
    );

    return successResponse(
      res,
      { canReview },
      canReview
        ? "You can review this product"
        : "You cannot review this product. You must purchase and receive it first, and you cannot review it more than once per order.",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get products that user can review (delivered & not reviewed)
export const getReviewableProducts = async (req, res) => {
  try {
    const userId = req.user._id;

    const products =
      await reviewService.userDeliveredProductsNotReviewed(userId);

    return successResponse(
      res,
      {
        products,
        totalCount: products.length,
      },
      "Reviewable products fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
// Create review
export const createReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const reviewData = req.body;
    const imageFile = req.file;

    const review = await reviewService.createReview(
      userId,
      reviewData,
      imageFile,
    );

    return successResponse(
      res,
      { review },
      "Review submitted successfully. Awaiting approval.",
      201,
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return errorResponse(res, error.message);
  }
};

// vote for helpful review
export const voteHelpfulReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reviewId } = req.params;

    const review = await reviewService.voteHelpfulToggle(reviewId, userId);

    return successResponse(res, { review }, "Your vote has been recorded");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get product reviews
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page, limit } = req.query;

    const result = await reviewService.getProductReviews(productId, {
      page,
      limit,
    });

    return successResponse(res, result, "Reviews fetched successfully");
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return errorResponse(res, error.message);
  }
};

// Get user reviews
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit } = req.query;

    const result = await reviewService.getUserReviews(userId, { page, limit });

    return successResponse(res, result, "Your reviews fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update review
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;
    const imageFile = req.file;

    const review = await reviewService.updateReview(
      reviewId,
      userId,
      updateData,
      imageFile,
    );

    return successResponse(
      res,
      { review },
      "Review updated successfully. Awaiting re-approval.",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    await reviewService.deleteReview(reviewId, userId);

    return successResponse(res, null, "Review deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Get all reviews (pending approval)
export const adminGetAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "pending" } = req.query;

    const filter = {};
    if (status === "pending") filter.isApproved = false;
    if (status === "approved") filter.isApproved = true;

    const reviews = await Review.find(filter)
      .populate("user", "name email")
      .populate("product", "name slug")
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Review.countDocuments(filter);

    return successResponse(
      res,
      {
        reviews,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Reviews fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Approve review
export const adminApproveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await reviewService.approveReview(reviewId);

    return successResponse(res, { review }, "Review approved successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Delete review
export const adminDeleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    await reviewService.adminDeleteReview(reviewId);

    return successResponse(res, null, "Review deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
