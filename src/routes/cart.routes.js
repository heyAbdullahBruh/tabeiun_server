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
} from "../validators/cart.validator.js";

const router = Router();

// Guest routes (with sessionId)
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

// Authenticated only routes
router.post("/merge", authenticateUser, mergeCart);
router.get("/validate-checkout", authenticateUser, validateCartForCheckout);

export default router;
