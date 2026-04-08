// src/routes/activityLog.routes.js - Updated with delete controllers

import { Router } from "express";
import {
  getAllActivityLogs,
  getActivitySummaries,
  AdminActivityLogs,
  ActivityLogById,
  exportActivityLogs,
  deleteActivityLogsByPeriodController,
  deleteActivityLogByIdController,
  deleteMultipleActivityLogsController,
  getActivityLogStatsController,
  autoCleanupActivityLogsController,
} from "../controllers/activityLog.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// All activity log routes require admin authentication
router.use(authenticateAdmin, isAdmin);

// GET routes
router.get("/", getAllActivityLogs);
router.get("/summary", getActivitySummaries);
router.get("/stats", getActivityLogStatsController);
router.get("/admin/:adminId", AdminActivityLogs);
router.get("/:logId", ActivityLogById);
router.get("/export/csv", exportActivityLogs);

// DELETE routes (service-based)
router.delete("/period/:period", deleteActivityLogsByPeriodController);
router.delete("/:logId", deleteActivityLogByIdController);
router.post("/delete-multiple", deleteMultipleActivityLogsController);

// POST routes
router.post("/auto-cleanup", autoCleanupActivityLogsController);

export default router;
