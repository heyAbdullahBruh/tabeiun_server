// src/routes/favourite.routes.js - WITH VALIDATORS
import { Router } from "express";
import {
  addToFavourites,
  removeFromFavourites,
  getFavourites,
  checkFavourite,
  getFavouriteCount,
  clearFavourites,
} from "../controllers/favourite.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { productIdValidator } from "../validators/favourite.validator.js";

const router = Router();

// All favourite routes require authentication
router.use(authenticateUser);

// Get user's favourites
router.get("/", getFavourites);

// Add product to favourites
router.post("/:productId", validate(productIdValidator), addToFavourites);

// Remove product from favourites
router.delete(
  "/:productId",
  validate(productIdValidator),
  removeFromFavourites,
);

// Check if product is in favourites
router.get("/check/:productId", validate(productIdValidator), checkFavourite);

// Get favourite count for product
router.get(
  "/count/:productId",
  validate(productIdValidator),
  getFavouriteCount,
);

// Clear all favourites
router.delete("/clear/all", clearFavourites);

export default router;
