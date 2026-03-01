import { Router } from "express";
import multer from "multer";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getProducts,
  toggleProductStatus,
  bulkDeleteProducts,
} from "../controllers/product.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdminOrModerator } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createProductValidator,
  updateProductValidator,
  getProductsValidator,
  productIdValidator,
} from "../validators/product.validator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = Router();

// Public routes
router.get("/", validate(getProductsValidator), getProducts);
router.get("/:slugOrId", getProduct);

// Protected routes (Admin/Moderator only)
router.post(
  "/",
  authenticateAdmin,
  isAdminOrModerator,
  upload.array("images", 5),
  validate(createProductValidator),
  createProduct,
);

router.put(
  "/:productId",
  authenticateAdmin,
  isAdminOrModerator,
  upload.array("images", 5),
  validate(updateProductValidator),
  updateProduct,
);

router.delete(
  "/:productId",
  authenticateAdmin,
  isAdminOrModerator,
  validate(productIdValidator),
  deleteProduct,
);

router.patch(
  "/:productId/toggle-status",
  authenticateAdmin,
  isAdminOrModerator,
  validate(productIdValidator),
  toggleProductStatus,
);

router.post(
  "/bulk-delete",
  authenticateAdmin,
  isAdminOrModerator,
  bulkDeleteProducts,
);

export default router;
