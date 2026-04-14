import Review from "../models/Review.model.js";
import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import { uploadToImageKit, deleteFromImageKit } from "../config/imagekit.js";
import mongoose from "mongoose";

class ReviewService {
  constructor() {
    this.Review = Review;
    this.Order = Order;
    this.Product = Product;
  }

  // Helper: Convert string to ObjectId safely
  #toObjectId(id) {
    if (!id) return null;
    if (id instanceof mongoose.Types.ObjectId) return id;
    if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
    return id;
  }

  // Has already reviewed by this user
  async hasAlreadyReviewed(userId, productId) {
    const order = await this.Order.findOne({
      user: userId,
      status: "Delivered",
      "products.product": productId,
    });

    if (!order) {
      return false;
    }

    const review = await this.Review.findOne({
      user: userId,
      product: productId,
      orderId: order._id,
    });

    return !!review;
  }

  // Check if user can review a product
  async isThisProductReadyForReviewByUser(userId, productId) {
    const order = await this.Order.findOne({
      user: userId,
      status: "Delivered",
      "products.product": productId,
    });

    if (!order) {
      return false;
    }

    const review = await this.Review.findOne({
      user: userId,
      product: productId,
      orderId: order._id,
    });

    return !review;
  }

  // Get user's delivered products that haven't been reviewed yet
  async userDeliveredProductsNotReviewed(userId) {
    try {
      // Find all delivered orders for the user
      const orders = await this.Order.find({
        user: userId,
        status: "Delivered",
      })
        .populate("products.product", "name slug price images")
        .lean();

      if (!orders.length) {
        return [];
      }

      // Collect all products from delivered orders with their order info
      const productsWithOrderInfo = [];

      for (const order of orders) {
        for (const item of order.products) {
          if (item.product) {
            // Check if already reviewed
            const existingReview = await this.Review.findOne({
              user: userId,
              product: item.product._id,
              orderId: order._id,
            });

            if (!existingReview) {
              productsWithOrderInfo.push({
                orderId: order._id,
                orderIdDisplay: order.orderId,
                product: {
                  _id: item.product._id,
                  name: item.product.name,
                  slug: item.product.slug,
                  price: item.priceAtPurchase || item.product.price,
                  discountPrice: item.product.discountPrice,
                  image: item.product.images?.[0]?.url || null,
                  quantity: item.quantity,
                },
                orderDate: order.createdAt,
                orderStatus: order.status,
              });
            }
          }
        }
      }

      return productsWithOrderInfo;
    } catch (error) {
      throw new Error(`Failed to fetch reviewable products: ${error.message}`);
    }
  }
  // Create review
  async createReview(userId, reviewData, imageFile = null) {
    try {
      const { productId, orderId, rating, comment } = reviewData;

      // Check if user purchased this product
      const order = await this.Order.findOne({
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
      const existingReview = await this.Review.findOne({
        user: userId,
        product: productId,
        orderId: orderId,
      });

      if (existingReview) {
        throw new Error(
          "You have already reviewed this product for this order",
        );
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

      const review = await this.Review.create({
        user: userId,
        product: productId,
        orderId: orderId,
        rating,
        comment,
        image,
        isApproved: false,
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }

  // Vote for helpful review
  async voteHelpfulToggle(reviewId, userId) {
    try {
      const review = await this.Review.findById(reviewId);

      if (!review) {
        throw new Error("Review not found");
      }

      const hasVoted = review.helpedBy?.includes(userId);

      if (hasVoted) {
        review.helpfulCount -= 1;
        review.helpedBy.pull(userId);
      } else {
        review.helpfulCount += 1;
        review.helpedBy.push(userId);
      }

      await review.save();

      return { helpfulCount: review.helpfulCount, hasVoted: !hasVoted };
    } catch (error) {
      throw new Error(`Failed to toggle helpful vote: ${error.message}`);
    }
  }

  // Get product reviews (public)
  async getProductReviews(productId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;

      // FIXED: Convert productId to ObjectId properly
      const objectId = this.#toObjectId(productId);

      const reviews = await this.Review.find({
        product: objectId,
        isApproved: true,
      })
        .populate("user", "name avatar")
        .sort("-createdAt")
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await this.Review.countDocuments({
        product: objectId,
        isApproved: true,
      });

      // FIXED: Use new mongoose.Types.ObjectId() instead of mongoose.Types.ObjectId()
      const ratingStats = await this.Review.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(productId),
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
  }

  // Get user reviews (authenticated)
  async getUserReviews(userId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;

      const reviews = await this.Review.find({ user: userId })
        .populate("product", "name slug images price")
        .sort("-createdAt")
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await this.Review.countDocuments({ user: userId });

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
  }

  // Update review (user)
  async updateReview(reviewId, userId, updateData, imageFile = null) {
    try {
      const review = await this.Review.findOne({ _id: reviewId, user: userId });

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
  }

  // Delete review (user)
  async deleteReview(reviewId, userId) {
    try {
      const review = await this.Review.findOne({ _id: reviewId, user: userId });

      if (!review) {
        throw new Error("Review not found");
      }

      if (review.image?.imageId) {
        await deleteFromImageKit(review.image.imageId);
      }

      await review.deleteOne();

      // Update product rating after deletion
      await this.#updateProductRating(review.product);

      return true;
    } catch (error) {
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }

  // Admin: Approve review
  async approveReview(reviewId) {
    try {
      const review = await this.Review.findById(reviewId);

      if (!review) {
        throw new Error("Review not found");
      }

      review.isApproved = true;
      await review.save();

      // Update product rating
      await this.#updateProductRating(review.product);

      return review;
    } catch (error) {
      throw new Error(`Failed to approve review: ${error.message}`);
    }
  }

  // Admin: Delete review
  async adminDeleteReview(reviewId) {
    try {
      const review = await this.Review.findById(reviewId);

      if (!review) {
        throw new Error("Review not found");
      }

      if (review.image?.imageId) {
        await deleteFromImageKit(review.image.imageId);
      }

      await review.deleteOne();

      // Update product rating
      await this.#updateProductRating(review.product);

      return true;
    } catch (error) {
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }

  // Admin: Get all reviews (with filters)
  async getAllReviews(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = "all",
        productId,
        userId,
      } = options;

      const filter = {};

      if (status === "pending") filter.isApproved = false;
      if (status === "approved") filter.isApproved = true;
      if (productId) filter.product = this.#toObjectId(productId);
      if (userId) filter.user = this.#toObjectId(userId);

      const reviews = await this.Review.find(filter)
        .populate("user", "name email avatar")
        .populate("product", "name slug images")
        .sort("-createdAt")
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await this.Review.countDocuments(filter);

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
      throw new Error(`Failed to fetch all reviews: ${error.message}`);
    }
  }

  // Helper: Update product rating (private method)
  async #updateProductRating(productId) {
    try {
      const objectId = this.#toObjectId(productId);

      const stats = await this.Review.aggregate([
        {
          $match: {
            product: objectId,
            isApproved: true,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      await this.Product.findByIdAndUpdate(productId, {
        ratingAverage: stats[0]?.averageRating?.toFixed(1) || 0,
        ratingCount: stats[0]?.totalReviews || 0,
      });
    } catch (error) {
      console.error("Failed to update product rating:", error);
    }
  }

  // Get review statistics for a product
  async getReviewStats(productId) {
    try {
      const objectId = this.#toObjectId(productId);

      const stats = await this.Review.aggregate([
        {
          $match: {
            product: objectId,
            isApproved: true,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            fiveStar: {
              $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
            },
            fourStar: {
              $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
            },
            threeStar: {
              $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
            },
            twoStar: {
              $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
            },
            oneStar: {
              $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
            },
          },
        },
      ]);

      return (
        stats[0] || {
          averageRating: 0,
          totalReviews: 0,
          fiveStar: 0,
          fourStar: 0,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0,
        }
      );
    } catch (error) {
      throw new Error(`Failed to fetch review stats: ${error.message}`);
    }
  }
}

// Export a single instance
export default new ReviewService();
