import { Router } from "express";
import {
  verifyAdminJWT,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";
import {
  createProduct,
  getPublicProducts,
  getProductBySlug,
  softDeleteProduct,
} from "../controllers/product.controller.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// PUBLIC ROUTES
router.get("/all", getPublicProducts);
router.get("/details/:slug", getProductBySlug);

// ADMIN/MODERATOR ROUTES
router.post(
  "/admin/add",
  verifyAdminJWT,
  authorizeRoles("ADMIN", "MODERATOR"),
  upload.array("images", 5),
  createProduct,
);

router.delete(
  "/admin/delete/:id",
  verifyAdminJWT,
  authorizeRoles("ADMIN"), // Only Admin can delete
  softDeleteProduct,
);

export default router;
/** */