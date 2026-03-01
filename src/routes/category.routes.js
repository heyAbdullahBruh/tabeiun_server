import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdminOrModerator } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
} from "../validators/category.validator.js";

const router = Router();

// Public routes
router.get("/", getCategories);
router.get("/:slugOrId", getCategory);

// Protected routes
router.post(
  "/",
  authenticateAdmin,
  isAdminOrModerator,
  validate(createCategoryValidator),
  createCategory,
);

router.put(
  "/:categoryId",
  authenticateAdmin,
  isAdminOrModerator,
  validate(updateCategoryValidator),
  updateCategory,
);

router.patch(
  "/:categoryId/toggle-status",
  authenticateAdmin,
  isAdminOrModerator,
  validate(categoryIdValidator),
  toggleCategoryStatus,
);

router.delete(
  "/:categoryId",
  authenticateAdmin,
  isAdminOrModerator,
  validate(categoryIdValidator),
  deleteCategory,
);

export default router;
