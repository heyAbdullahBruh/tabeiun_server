import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getUserOrder,
  cancelOrder,
  trackOrder,
  getAllOrders,
  getOrderDetails,
  confirmOrder,
  updateOrderStatus,
  getOrderStats, // NEW
  getOrderAnalytics, // NEW
  getRealtimeOrderStats, // NEW
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

// ==========================================
// USER ROUTES
// ==========================================
router.post(
  "/create",
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
router.get("/track/:orderId", authenticateUser, trackOrder);

// ==========================================
// ADMIN ROUTES
// ==========================================

// NEW: Order statistics endpoints (must come before /:orderId routes)
router.get(
  "/admin/stats",
  authenticateAdmin,
  isAdminOrModerator,
  getOrderStats,
);

router.get(
  "/admin/analytics",
  authenticateAdmin,
  isAdminOrModerator,
  getOrderAnalytics,
);

router.get(
  "/admin/realtime",
  authenticateAdmin,
  isAdminOrModerator,
  getRealtimeOrderStats,
);

router.get("/admin/all", authenticateAdmin, isAdminOrModerator, getAllOrders);

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
