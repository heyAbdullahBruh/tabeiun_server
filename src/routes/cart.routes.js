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

const router = Router();

// All cart routes require authentication
router.use(authenticateUser);

router.get("/", getCart);
router.post("/items", addToCart);
router.put("/items/:itemId", updateCartItem);
router.delete("/items/:itemId", removeFromCart);
router.delete("/clear", clearCart);
router.post("/merge", mergeCart);
router.get("/validate-checkout", validateCartForCheckout);

export default router;
