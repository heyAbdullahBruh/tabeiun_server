// src/routes/favourite.routes.js - UPDATED
import { Router } from "express";
import {
  addToFavourites,
  removeFromFavourites,
  getFavourites,
  checkFavourite,
  getFavouriteCount,
  clearFavourites,
  mergeFavourites,
} from "../controllers/favourite.controller.js";
import {
  authenticateUser,
  optionalAuth,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { productIdValidator } from "../validators/favourite.validator.js";

const router = Router();

// Guest routes (with sessionId)
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
router.delete("/clear/all", optionalAuth, clearFavourites);

// Public route
router.get(
  "/count/:productId",
  validate(productIdValidator),
  getFavouriteCount,
);

// Authenticated only routes
router.post("/merge", authenticateUser, mergeFavourites);

export default router;
