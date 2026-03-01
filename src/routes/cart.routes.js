// src/routes/cart.routes.js - WITH VALIDATORS
import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
  validateCartForCheckout,
} from "../controllers/cart.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  addToCartValidator,
  updateCartItemValidator,
  mergeCartValidator,
} from "../validators/cart.validator.js";

const router = Router();

// All cart routes require authentication
router.use(authenticateUser);

// Get user cart
router.get("/", getCart);

// Add item to cart
router.post("/items", validate(addToCartValidator), addToCart);

// Update cart item quantity
router.put("/items/:itemId", validate(updateCartItemValidator), updateCartItem);

// Remove item from cart
router.delete("/items/:itemId", removeFromCart);

// Clear entire cart
router.delete("/clear", clearCart);

// Merge guest cart with user cart
router.post("/merge", validate(mergeCartValidator), mergeCart);

// Validate cart before checkout
router.get("/validate-checkout", validateCartForCheckout);

export default router;
