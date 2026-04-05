import { Router } from "express";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserPreferences,
  updateUserPreferences,
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  getLoginHistory,
  exportLoginHistory,
  testNotification,
} from "../controllers/settings.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  notificationPreferencesValidator,
  userPreferencesValidator,
} from "../validators/settings.validator.js";

const router = Router();

// All settings routes require authentication
router.use(authenticateAdmin);

// Notification Preferences
router.get("/notifications", getNotificationPreferences);
router.patch(
  "/notifications",
  validate(notificationPreferencesValidator),
  updateNotificationPreferences,
);

// User Preferences (Theme, Language, etc.)
router.get("/preferences", getUserPreferences);
router.patch(
  "/preferences",
  validate(userPreferencesValidator),
  updateUserPreferences,
);

// Session Management
router.get("/sessions", getActiveSessions);
router.delete("/sessions/:sessionId", revokeSession);
router.post("/sessions/revoke-all", revokeAllSessions);

// Login History
router.get("/login-history", getLoginHistory);
router.get("/login-history/export", exportLoginHistory);

// Test Notification
router.post("/test-notification", testNotification);

export default router;
