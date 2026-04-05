import { Router } from "express";
import {
  getAllActivityLogs,
  getActivitySummaries,
  AdminActivityLogs,
  ActivityLogById,
  exportActivityLogs,
} from "../controllers/activityLog.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdmin, isAdminOrModerator } from "../middlewares/role.middleware.js";

const router = Router();

// All activity log routes require admin authentication
router.use(authenticateAdmin);

// Get activity logs with pagination and filtering
router.get("/", isAdmin, getAllActivityLogs);

// Get activity summary for dashboard
router.get("/summary", isAdminOrModerator, getActivitySummaries);

// Get activity logs for specific admin
router.get("/admin/:adminId", isAdminOrModerator, AdminActivityLogs);

// Get single activity log by ID
router.get("/:logId", isAdminOrModerator, ActivityLogById);

// Export activity logs to CSV
router.get("/export/csv", isAdminOrModerator, exportActivityLogs);

export default router;
