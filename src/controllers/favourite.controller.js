import Favourite from "../models/Favourite.model.js";
import Product from "../models/Product.model.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";

// Helper function to get favourite filter
const getFavouriteFilter = (req) => {
  if (req.user) {
    return { user: req.user._id };
  }
  if (req.sessionId) {
    return { sessionId: req.sessionId };
  }
  return null;
};

// Add to Favourites - UPDATED
export const addToFavourites = async (req, res) => {
  try {
    const { productId } = req.params;
    const filter = getFavouriteFilter(req);

    if (!filter) {
      return errorResponse(
        res,
        "Session ID required for guest favourites",
        400,
      );
    }

    const product = await Product.findOne({
      _id: productId,
      isPublished: true,
      isDeleted: false,
    });

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    const existing = await Favourite.findOne({ ...filter, product: productId });
    if (existing) {
      return errorResponse(res, "Product already in favourites", 400);
    }

    await Favourite.create({ ...filter, product: productId });

    return successResponse(res, null, "Added to favourites successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Remove from Favourites - UPDATED
export const removeFromFavourites = async (req, res) => {
  try {
    const { productId } = req.params;
    const filter = getFavouriteFilter(req);

    if (!filter) {
      return errorResponse(res, "Favourites not found", 404);
    }

    const result = await Favourite.findOneAndDelete({
      ...filter,
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

// Get User's Favourites - UPDATED
export const getFavourites = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = getFavouriteFilter(req);

    if (!filter) {
      return successResponse(res, { favourites: [], total: 0, pagination: {} });
    }

    const favourites = await Favourite.find(filter)
      .populate({
        path: "product",
        match: { isPublished: true, isDeleted: false },
        select:
          "name slug price discountPrice images shortDescription ratingAverage",
      })
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const validFavourites = favourites.filter((f) => f.product !== null);
    const total = await Favourite.countDocuments(filter);

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

// Check favourite - UPDATED
export const checkFavourite = async (req, res) => {
  try {
    const { productId } = req.params;
    const filter = getFavouriteFilter(req);

    if (!filter) {
      return successResponse(res, { isFavourite: false });
    }

    const favourite = await Favourite.findOne({
      ...filter,
      product: productId,
    });

    return successResponse(res, {
      isFavourite: !!favourite,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get favourite count - KEEP AS IS (public endpoint)
export const getFavouriteCount = async (req, res) => {
  try {
    const { productId } = req.params;
    const count = await Favourite.countDocuments({ product: productId });
    return successResponse(res, { count });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Clear all favourites - UPDATED
export const clearFavourites = async (req, res) => {
  try {
    const filter = getFavouriteFilter(req);

    if (!filter) {
      return successResponse(res, null, "All favourites cleared");
    }

    await Favourite.deleteMany(filter);

    return successResponse(res, null, "All favourites cleared");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Merge guest favourites with user - ADD THIS
export const mergeFavourites = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    if (!sessionId) {
      return errorResponse(res, "Session ID required", 400);
    }

    // Find guest favourites
    const guestFavourites = await Favourite.find({ sessionId });

    // Add each guest favourite to user if not already exists
    for (const guestFav of guestFavourites) {
      const exists = await Favourite.findOne({
        user: userId,
        product: guestFav.product,
      });

      if (!exists) {
        await Favourite.create({
          user: userId,
          product: guestFav.product,
        });
      }
    }

    // Delete guest favourites after merge
    await Favourite.deleteMany({ sessionId });

    return successResponse(res, null, "Favourites merged successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
