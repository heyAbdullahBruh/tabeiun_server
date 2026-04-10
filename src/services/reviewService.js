import Review from "../models/Review.model.js";
import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import { uploadToImageKit, deleteFromImageKit } from "../config/imagekit.js";

// Create review
export const createReview = async (userId, reviewData, imageFile = null) => {
  try {
    const { productId, orderId, rating, comment } = reviewData;

    // Check if user purchased this product
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      status: "Delivered",
      "products.product": productId,
    });

    if (!order) {
      throw new Error(
        "You can only review products you have purchased and received",
      );
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
      orderId: orderId,
    });

    if (existingReview) {
      throw new Error("You have already reviewed this product for this order");
    }

    let image = null;
    if (imageFile) {
      const uploaded = await uploadToImageKit(
        imageFile,
        "reviews",
        `review-${Date.now()}`,
      );
      image = {
        imageId: uploaded.imageId,
        url: uploaded.url,
      };
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      orderId: orderId,
      rating,
      comment,
      image,
      isApproved: false, // Requires admin approval
    });

    return review;
  } catch (error) {
    throw new Error(`Failed to create review: ${error.message}`);
  }
};

// Get product reviews (public)
export const getProductReviews = async (productId, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;

    const reviews = await Review.find({
      product: productId,
      isApproved: true,
    })
      .populate("user", "name avatar")
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Review.countDocuments({
      product: productId,
      isApproved: true,
    });

    const ratingStats = await Review.aggregate([
      {
        $match: {
          product: mongoose.Types.ObjectId(productId),
          isApproved: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    return {
      reviews,
      stats: ratingStats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [],
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }
};

// Get user reviews (authenticated)
export const getUserReviews = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10 } = options;

    const reviews = await Review.find({ user: userId })
      .populate("product", "name slug images price")
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Review.countDocuments({ user: userId });

    return {
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch user reviews: ${error.message}`);
  }
};

// Update review (user)
export const updateReview = async (
  reviewId,
  userId,
  updateData,
  imageFile = null,
) => {
  try {
    const review = await Review.findOne({ _id: reviewId, user: userId });

    if (!review) {
      throw new Error("Review not found");
    }

    if (updateData.rating) review.rating = updateData.rating;
    if (updateData.comment) review.comment = updateData.comment;

    if (imageFile) {
      // Delete old image if exists
      if (review.image?.imageId) {
        await deleteFromImageKit(review.image.imageId);
      }

      const uploaded = await uploadToImageKit(
        imageFile,
        "reviews",
        `review-${Date.now()}`,
      );
      review.image = {
        imageId: uploaded.imageId,
        url: uploaded.url,
      };
    }

    review.isApproved = false; // Need re-approval after update
    await review.save();

    return review;
  } catch (error) {
    throw new Error(`Failed to update review: ${error.message}`);
  }
};

// Delete review (user)
export const deleteReview = async (reviewId, userId) => {
  try {
    const review = await Review.findOne({ _id: reviewId, user: userId });

    if (!review) {
      throw new Error("Review not found");
    }

    if (review.image?.imageId) {
      await deleteFromImageKit(review.image.imageId);
    }

    await review.deleteOne();

    return true;
  } catch (error) {
    throw new Error(`Failed to delete review: ${error.message}`);
  }
};

// Admin: Approve review
export const approveReview = async (reviewId) => {
  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error("Review not found");
    }

    review.isApproved = true;
    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    return review;
  } catch (error) {
    throw new Error(`Failed to approve review: ${error.message}`);
  }
};

// Admin: Delete review
export const adminDeleteReview = async (reviewId) => {
  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error("Review not found");
    }

    if (review.image?.imageId) {
      await deleteFromImageKit(review.image.imageId);
    }

    await review.deleteOne();

    // Update product rating
    await updateProductRating(review.product);

    return true;
  } catch (error) {
    throw new Error(`Failed to delete review: ${error.message}`);
  }
};

// Helper: Update product rating
const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    {
      $match: { product: mongoose.Types.ObjectId(productId), isApproved: true },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  await Product.findByIdAndUpdate(productId, {
    ratingAverage: stats[0]?.averageRating?.toFixed(1) || 0,
    ratingCount: stats[0]?.totalReviews || 0,
  });
};
