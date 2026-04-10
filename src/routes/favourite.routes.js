// src/routes/favourite.routes.js - UPDATED
import { Router } from "express";
import {
  addToFavourites,
  removeFromFavourites,
  getFavourites,
  checkFavourite,
  getFavouriteCount,
  clearFavourites,
} from "../controllers/favourite.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { productIdValidator } from "../validators/favourite.validator.js";

const router = Router();

// Guest routes (with sessionId) - No authentication required
router.get("/", optionalAuth, getFavourites);
router.post(
  "/:productId",
  optionalAuth,
  validate(productIdValidator),
  addToFavourites,
);
router.delete(
  "/:productId",
  optionalAuth,
  validate(productIdValidator),
  removeFromFavourites,
);
router.get(
  "/check/:productId",
  optionalAuth,
  validate(productIdValidator),
  checkFavourite,
);
router.get(
  "/count/:productId",
  optionalAuth,
  validate(productIdValidator),
  getFavouriteCount,
);
router.delete("/clear/all", optionalAuth, clearFavourites);

// No merge endpoint needed - implement in cart controller pattern

export default router;
