import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getNotificationSettings,
  updateNotificationSettings,
} from "../controllers/notification.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// All notification routes require authentication
router.use(authenticateAdmin);

// Notification endpoints
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:notificationId/read", markAsRead);
router.post("/mark-all-read", markAllAsRead);
router.delete("/delete-all", markAllAsRead);

// Notification settings
router.get("/settings", getNotificationSettings);
router.patch("/settings", updateNotificationSettings);

export default router;
