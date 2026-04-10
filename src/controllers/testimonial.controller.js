import Review from "../models/Review.model.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";

/**
 * Get all approved reviews (testimonials) with pagination and filters
 * GET /api/v1/testimonials/all
 */
export const getAllTestimonials = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      rating,
      sortBy = "newest",
      productId,
    } = req.query;

    // Build filter
    const filter = { isApproved: true };

    if (rating) {
      filter.rating = parseInt(rating);
    }

    if (productId) {
      filter.product = productId;
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "highest":
        sort = { rating: -1 };
        break;
      case "lowest":
        sort = { rating: 1 };
        break;
      case "mostHelpful":
        sort = { helpfulCount: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const testimonials = await Review.find(filter)
      .populate("user", "name avatar")
      .populate("product", "name slug images")
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Review.countDocuments(filter);

    // Format testimonials for frontend
    const formattedTestimonials = testimonials.map((testimonial) => ({
      id: testimonial._id,
      userName: testimonial.user?.name || "Anonymous User",
      userAvatar: testimonial.user?.avatar || null,
      productName: testimonial.product?.name,
      productSlug: testimonial.product?.slug,
      productImage: testimonial.product?.images?.[0]?.url || null,
      rating: testimonial.rating,
      comment: testimonial.comment,
      image: testimonial.image?.url || null,
      date: testimonial.createdAt,
      helpfulCount: testimonial.helpfulCount || 0,
    }));

    return paginationResponse(
      res,
      formattedTestimonials,
      total,
      page,
      limit,
      "Testimonials fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Get featured testimonials for homepage
 * GET /api/v1/testimonials/featured?limit=6
 */
export const getFeaturedTestimonials = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const testimonials = await Review.find({ isApproved: true })
      .populate("user", "name avatar")
      .populate("product", "name slug")
      .sort({ rating: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedTestimonials = testimonials.map((testimonial) => ({
      id: testimonial._id,
      userName: testimonial.user?.name || "Anonymous User",
      userAvatar: testimonial.user?.avatar || null,
      productName: testimonial.product?.name,
      productSlug: testimonial.product?.slug,
      rating: testimonial.rating,
      comment:
        testimonial.comment.length > 200
          ? testimonial.comment.substring(0, 200) + "..."
          : testimonial.comment,
      date: testimonial.createdAt,
    }));

    return successResponse(
      res,
      { testimonials: formattedTestimonials },
      "Featured testimonials fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Get testimonial statistics (rating distribution)
 * GET /api/v1/testimonials/stats
 */
export const getTestimonialStats = async (req, res) => {
  try {
    const { productId } = req.query;

    const filter = { isApproved: true };
    if (productId) {
      filter.product = productId;
    }

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get overall stats
    const overallStats = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          fiveStarCount: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStarCount: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStarCount: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStarCount: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStarCount: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    // Format distribution for frontend (1-5 stars)
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingDistribution.forEach((item) => {
      distribution[item._id] = item.count;
    });

    const stats = overallStats[0] || {
      averageRating: 0,
      totalReviews: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
    };

    // Calculate percentage for each rating
    const total = stats.totalReviews || 1;
    const percentages = {
      1: ((distribution[1] / total) * 100).toFixed(1),
      2: ((distribution[2] / total) * 100).toFixed(1),
      3: ((distribution[3] / total) * 100).toFixed(1),
      4: ((distribution[4] / total) * 100).toFixed(1),
      5: ((distribution[5] / total) * 100).toFixed(1),
    };

    return successResponse(
      res,
      {
        averageRating: parseFloat(stats.averageRating?.toFixed(1) || 0),
        totalReviews: stats.totalReviews,
        distribution: {
          1: { count: distribution[1], percentage: percentages[1] },
          2: { count: distribution[2], percentage: percentages[2] },
          3: { count: distribution[3], percentage: percentages[3] },
          4: { count: distribution[4], percentage: percentages[4] },
          5: { count: distribution[5], percentage: percentages[5] },
        },
        starCounts: {
          5: stats.fiveStarCount,
          4: stats.fourStarCount,
          3: stats.threeStarCount,
          2: stats.twoStarCount,
          1: stats.oneStarCount,
        },
      },
      "Testimonial stats fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Mark testimonial as helpful (user can upvote)
 * POST /api/v1/testimonials/:id/helpful
 */
export const markTestimonialHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const testimonial = await Review.findById(id);
    if (!testimonial) {
      return errorResponse(res, "Testimonial not found", 404);
    }

    // Track which users found it helpful (optional - prevent duplicate)
    if (userId) {
      const alreadyHelped = testimonial.helpedBy?.includes(userId);
      if (alreadyHelped) {
        return errorResponse(res, "You already marked this as helpful", 400);
      }
      testimonial.helpedBy = [...(testimonial.helpedBy || []), userId];
    }

    testimonial.helpfulCount = (testimonial.helpfulCount || 0) + 1;
    await testimonial.save();

    return successResponse(
      res,
      { helpfulCount: testimonial.helpfulCount },
      "Marked as helpful",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Get single testimonial by ID
 * GET /api/v1/testimonials/:id
 */
export const getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Review.findById(id)
      .populate("user", "name avatar")
      .populate("product", "name slug images price")
      .lean();

    if (!testimonial) {
      return errorResponse(res, "Testimonial not found", 404);
    }

    if (!testimonial.isApproved) {
      return errorResponse(res, "Testimonial not available", 404);
    }

    return successResponse(
      res,
      { testimonial },
      "Testimonial fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
