import { Router } from "express";
import {
  getDashboardOverview,
  getSalesReport,
  getProductPerformance,
  getRevenueAnalytics,
  getTopSellingProducts,
  getCategoryPerformance,
  getUserAnalytics,
} from "../controllers/analytics.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdminOrModerator } from "../middlewares/role.middleware.js";

const router = Router();

// All analytics routes require authentication
router.use(authenticateAdmin, isAdminOrModerator);

router.get("/dashboard", getDashboardOverview);
router.get("/sales", getSalesReport);
router.get("/products/top", getTopSellingProducts);
router.get("/products/:productId/performance", getProductPerformance);
router.get("/revenue", getRevenueAnalytics);
router.get("/categories", getCategoryPerformance);
router.get("/users", getUserAnalytics);

export default router;
