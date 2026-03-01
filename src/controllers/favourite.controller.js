import Favourite from "../models/Favourite.model.js";
import Product from "../models/Product.model.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";

// Add to Favourites
export const addToFavourites = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Check if product exists
    const product = await Product.findOne({
      _id: productId,
      isPublished: true,
      isDeleted: false,
    });

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    // Check if already in favourites
    const existing = await Favourite.findOne({
      user: userId,
      product: productId,
    });
    if (existing) {
      return errorResponse(res, "Product already in favourites", 400);
    }

    // Add to favourites
    await Favourite.create({
      user: userId,
      product: productId,
    });

    return successResponse(res, null, "Added to favourites successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Remove from Favourites
export const removeFromFavourites = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const result = await Favourite.findOneAndDelete({
      user: userId,
      product: productId,
    });

    if (!result) {
      return errorResponse(res, "Product not found in favourites", 404);
    }

    return successResponse(res, null, "Removed from favourites successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get User's Favourites
export const getFavourites = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const favourites = await Favourite.find({ user: userId })
      .populate({
        path: "product",
        match: { isPublished: true, isDeleted: false },
        select:
          "name slug price discountPrice images shortDescription ratingAverage",
      })
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Filter out products that might have been deleted/unpublished
    const validFavourites = favourites.filter((f) => f.product !== null);

    const total = await Favourite.countDocuments({ user: userId });

    return paginationResponse(
      res,
      validFavourites.map((f) => f.product),
      total,
      page,
      limit,
      "Favourites fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Check if product is in user's favourites
export const checkFavourite = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const favourite = await Favourite.findOne({
      user: userId,
      product: productId,
    });

    return successResponse(res, {
      isFavourite: !!favourite,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get favourite count for product
export const getFavouriteCount = async (req, res) => {
  try {
    const { productId } = req.params;

    const count = await Favourite.countDocuments({ product: productId });

    return successResponse(res, { count });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Clear all favourites
export const clearFavourites = async (req, res) => {
  try {
    const userId = req.user._id;

    await Favourite.deleteMany({ user: userId });

    return successResponse(res, null, "All favourites cleared");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
