// src/routes/activityLog.routes.js
import { Router } from "express";
import {
  getAllActivityLogs,
  getActivitySummaries,
  AdminActivityLogs,
  ActivityLogById,
  exportActivityLogs,
} from "../controllers/activityLog.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// All activity log routes require admin authentication
router.use(authenticateAdmin, isAdmin);

// Get activity logs with pagination and filtering
router.get("/", getAllActivityLogs);

// Get activity summary for dashboard
router.get("/summary", getActivitySummaries);

// Get activity logs for specific admin
router.get("/admin/:adminId", AdminActivityLogs);

// Get single activity log by ID
router.get("/:logId", ActivityLogById);

// Export activity logs to CSV
router.get("/export/csv", exportActivityLogs);

export default router;
