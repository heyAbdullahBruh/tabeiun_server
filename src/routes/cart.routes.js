// src/routes/cart.routes.js - UPDATED
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
import {
  authenticateUser,
  optionalAuth,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  addToCartValidator,
  updateCartItemValidator,
  mergeCartValidator,
} from "../validators/cart.validator.js";

const router = Router();

// Guest routes (with sessionId) - No authentication required
router.get("/", optionalAuth, getCart);
router.post("/items", optionalAuth, validate(addToCartValidator), addToCart);
router.put(
  "/items/:itemId",
  optionalAuth,
  validate(updateCartItemValidator),
  updateCartItem,
);
router.delete("/items/:itemId", optionalAuth, removeFromCart);
router.delete("/clear", optionalAuth, clearCart);
router.get("/validate-checkout", authenticateUser, validateCartForCheckout); // Checkout needs auth

// Authenticated only routes
router.post(
  "/merge",
  authenticateUser,
  validate(mergeCartValidator),
  mergeCart,
);

export default router;
