import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

// Get user cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name slug price discountPrice images stock shortDescription",
    });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Filter out invalid products and calculate totals
    const validItems = cart.items.filter((item) => item.product !== null);
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    // Calculate cart summary
    const summary = calculateCartSummary(cart.items);

    return successResponse(res, {
      items: cart.items,
      summary,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Validate product
    const product = await Product.findOne({
      _id: productId,
      isPublished: true,
      isDeleted: false,
    });

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    // Check stock
    if (product.stock < quantity) {
      return errorResponse(
        res,
        `Only ${product.stock} items available in stock`,
        400,
      );
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Check stock for new quantity
      if (product.stock < newQuantity) {
        return errorResponse(
          res,
          `Cannot add ${quantity} more. Only ${product.stock} available`,
          400,
        );
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();

    // Get updated cart with populated products
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
      },
      "Item added to cart",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user._id;

    if (quantity < 1) {
      return errorResponse(res, "Quantity must be at least 1", 400);
    }

    if (quantity > 99) {
      return errorResponse(res, "Quantity cannot exceed 99", 400);
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return errorResponse(res, "Cart not found", 404);
    }

    // Find the item
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId,
    );

    if (itemIndex === -1) {
      return errorResponse(res, "Item not found in cart", 404);
    }

    // Check stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    if (product.stock < quantity) {
      return errorResponse(res, `Only ${product.stock} items available`, 400);
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Get updated cart
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
      },
      "Cart updated",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return errorResponse(res, "Cart not found", 404);
    }

    // Remove item
    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    // Get updated cart
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
      },
      "Item removed from cart",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return successResponse(
      res,
      {
        items: [],
        summary: {
          subtotal: 0,
          discount: 0,
          total: 0,
          itemCount: 0,
        },
      },
      "Cart cleared",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

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

// Merge guest cart with user cart (after login)
export const mergeCart = async (req, res) => {
  try {
    const { guestItems } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      return successResponse(res, null, "No items to merge");
    }

    let userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      userCart = new Cart({ user: userId, items: [] });
    }

    // Merge items
    for (const guestItem of guestItems) {
      const product = await Product.findOne({
        _id: guestItem.productId,
        isPublished: true,
        isDeleted: false,
      });

      if (!product) continue;

      const existingItem = userCart.items.find(
        (item) => item.product.toString() === guestItem.productId,
      );

      if (existingItem) {
        // Take the higher quantity
        existingItem.quantity = Math.max(
          existingItem.quantity,
          guestItem.quantity,
        );
      } else {
        userCart.items.push({
          product: guestItem.productId,
          quantity: guestItem.quantity,
        });
      }
    }

    await userCart.save();

    // Get updated cart
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
