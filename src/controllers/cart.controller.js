import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

// Helper function to calculate cart summary
const calculateCartSummary = (items) => {
  let subtotal = 0;
  let itemCount = 0;

  items.forEach((item) => {
    if (item.product) {
      const price = item.product.discountPrice || item.product.price;
      subtotal += price * item.quantity;
      itemCount += item.quantity;
    }
  });

  return {
    subtotal,
    discount: 0, // Can be implemented later for coupon codes
    total: subtotal,
    itemCount,
  };
};
const getCartFilter = (req) => {
  if (req.user) {
    return { user: req.user._id };
  }
  if (req.sessionId) {
    return { sessionId: req.sessionId };
  }
  return null;
};

// Get user cart - UPDATED
export const getCart = async (req, res) => {
  try {
    const filter = getCartFilter(req);

    if (!filter) {
      return successResponse(res, {
        items: [],
        summary: { subtotal: 0, discount: 0, total: 0, itemCount: 0 },
      });
    }

    let cart = await Cart.findOne(filter).populate({
      path: "items.product",
      select: "name slug price discountPrice images stock shortDescription",
    });

    if (!cart) {
      cart = { items: [] };
    }

    const validItems = cart.items.filter((item) => item.product !== null);
    const summary = calculateCartSummary(validItems);

    return successResponse(res, {
      items: validItems,
      summary,
      isGuest: !req.user,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Add item to cart - UPDATED
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const filter = getCartFilter(req);

    if (!filter) {
      return errorResponse(res, "Session ID required for guest cart", 400);
    }

    const product = await Product.findOne({
      _id: productId,
      isPublished: true,
      isDeleted: false,
    });

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    if (product.stock < quantity) {
      return errorResponse(res, `Only ${product.stock} items available`, 400);
    }

    let cart = await Cart.findOne(filter);
    if (!cart) {
      cart = new Cart({ ...filter, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (product.stock < newQuantity) {
        return errorResponse(
          res,
          `Cannot add ${quantity} more. Only ${product.stock} available`,
          400,
        );
      }
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name slug price discountPrice images stock",
    });

    const summary = calculateCartSummary(updatedCart.items);

    return successResponse(
      res,
      {
        items: updatedCart.items,
        summary,
        isGuest: !req.user,
      },
      "Item added to cart",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update cart item quantity - UPDATED
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const filter = getCartFilter(req);

    if (!filter) {
      return errorResponse(res, "Cart not found", 404);
    }

    if (quantity < 1 || quantity > 99) {
      return errorResponse(res, "Quantity must be between 1 and 99", 400);
    }

    const cart = await Cart.findOne(filter);
    if (!cart) {
      return errorResponse(res, "Cart not found", 404);
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId,
    );

    if (itemIndex === -1) {
      return errorResponse(res, "Item not found in cart", 404);
    }

    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    if (product.stock < quantity) {
      return errorResponse(res, `Only ${product.stock} items available`, 400);
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name slug price discountPrice images stock",
    });

    const summary = calculateCartSummary(updatedCart.items);

    return successResponse(
      res,
      {
        items: updatedCart.items,
        summary,
        isGuest: !req.user,
      },
      "Cart updated",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Remove from cart - UPDATED
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const filter = getCartFilter(req);

    if (!filter) {
      return errorResponse(res, "Cart not found", 404);
    }

    const cart = await Cart.findOne(filter);
    if (!cart) {
      return errorResponse(res, "Cart not found", 404);
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name slug price discountPrice images stock",
    });

    const summary = calculateCartSummary(updatedCart.items);

    return successResponse(
      res,
      {
        items: updatedCart.items,
        summary,
        isGuest: !req.user,
      },
      "Item removed from cart",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Clear cart - UPDATED
export const clearCart = async (req, res) => {
  try {
    const filter = getCartFilter(req);

    if (!filter) {
      return successResponse(res, {
        items: [],
        summary: { subtotal: 0, discount: 0, total: 0, itemCount: 0 },
      });
    }

    const cart = await Cart.findOne(filter);
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return successResponse(
      res,
      {
        items: [],
        summary: { subtotal: 0, discount: 0, total: 0, itemCount: 0 },
        isGuest: !req.user,
      },
      "Cart cleared",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Merge guest cart with user cart - UPDATED (uses sessionId from database)
export const mergeCart = async (req, res) => {
  try {
    const { sessionId } = req.body; // Get sessionId from request body
    const userId = req.user._id;

    if (!sessionId) {
      return errorResponse(res, "Session ID required", 400);
    }

    // Find guest cart by sessionId
    const guestCart = await Cart.findOne({ sessionId });

    // Find or create user cart
    let userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      userCart = new Cart({ user: userId, items: [] });
    }

    // Merge items from guest cart
    if (guestCart && guestCart.items.length > 0) {
      for (const guestItem of guestCart.items) {
        const existingItem = userCart.items.find(
          (item) => item.product.toString() === guestItem.product.toString(),
        );

        if (existingItem) {
          existingItem.quantity = Math.max(
            existingItem.quantity,
            guestItem.quantity,
          );
        } else {
          userCart.items.push(guestItem);
        }
      }

      await userCart.save();

      // Delete guest cart after merge
      await Cart.deleteOne({ sessionId });
    }

    const updatedCart = await Cart.findById(userCart._id).populate({
      path: "items.product",
      select: "name slug price discountPrice images stock",
    });

    const summary = calculateCartSummary(updatedCart.items);

    return successResponse(
      res,
      {
        items: updatedCart.items,
        summary,
      },
      "Cart merged successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Validate cart items before checkout
export const validateCartForCheckout = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name stock price discountPrice",
    });

    if (!cart || cart.items.length === 0) {
      return errorResponse(res, "Cart is empty", 400);
    }

    const validation = {
      valid: true,
      invalidItems: [],
      outOfStock: [],
      priceChanges: [],
    };

    for (const item of cart.items) {
      if (!item.product) {
        validation.valid = false;
        validation.invalidItems.push({
          itemId: item._id,
          reason: "Product no longer exists",
        });
        continue;
      }

      if (item.product.stock < item.quantity) {
        validation.valid = false;
        validation.outOfStock.push({
          productId: item.product._id,
          name: item.product.name,
          requested: item.quantity,
          available: item.product.stock,
        });
      }
    }

    return successResponse(res, validation);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
