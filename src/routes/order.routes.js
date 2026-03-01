import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getUserOrder,
  cancelOrder,
  getAllOrders,
  getOrderDetails,
  confirmOrder,
  updateOrderStatus,
  getOrderStats,
} from "../controllers/order.controller.js";
import {
  authenticateUser,
  authenticateAdmin,
} from "../middlewares/auth.middleware.js";
import { isAdminOrModerator } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createOrderValidator,
  orderStatusValidator,
  orderIdValidator,
} from "../validators/order.validator.js";
import { orderRateLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// User routes
router.post(
  "/",
  authenticateUser,
  orderRateLimiter,
  validate(createOrderValidator),
  createOrder,
);

router.get("/my-orders", authenticateUser, getUserOrders);

router.get(
  "/my-orders/:orderId",
  authenticateUser,
  validate(orderIdValidator),
  getUserOrder,
);

router.post(
  "/:orderId/cancel",
  authenticateUser,
  validate(orderIdValidator),
  cancelOrder,
);

// Admin routes
router.get("/admin/all", authenticateAdmin, isAdminOrModerator, getAllOrders);

router.get(
  "/admin/stats",
  authenticateAdmin,
  isAdminOrModerator,
  getOrderStats,
);

router.get(
  "/admin/:orderId",
  authenticateAdmin,
  isAdminOrModerator,
  validate(orderIdValidator),
  getOrderDetails,
);

router.post(
  "/admin/:orderId/confirm",
  authenticateAdmin,
  isAdminOrModerator,
  validate(orderIdValidator),
  confirmOrder,
);

router.patch(
  "/admin/:orderId/status",
  authenticateAdmin,
  isAdminOrModerator,
  validate(orderStatusValidator),
  updateOrderStatus,
);

export default router;
