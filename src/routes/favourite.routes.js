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

const router = Router();

// All favourite routes require authentication
router.use(authenticateUser);

router.get("/", getFavourites);
router.post("/:productId", addToFavourites);
router.delete("/:productId", removeFromFavourites);
router.get("/check/:productId", checkFavourite);
router.get("/count/:productId", getFavouriteCount);
router.delete("/clear/all", clearFavourites);

export default router;
