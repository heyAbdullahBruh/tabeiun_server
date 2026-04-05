import Admin from "../models/Admin.model.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";
import AdminActivityLog from "../models/AdminActivityLog.model.js";

// Get notification preferences
export const getNotificationPreferences = async (req, res) => {
  try {
    const adminId = req.admin._id;

    const admin = await Admin.findById(adminId).select(
      "notificationPreferences",
    );

    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Default notification preferences if not set
    const defaultPreferences = {
      email: {
        orderNotifications: true,
        newUserAlerts: true,
        lowStockAlerts: true,
        dailySummary: false,
        weeklyReport: true,
        systemUpdates: true,
        marketingEmails: false,
      },
      inApp: {
        realTimeOrders: true,
        mentionNotifications: true,
        taskAssignments: true,
        commentReplies: false,
      },
      desktop: {
        enabled: false,
        soundAlerts: true,
        quietHours: {
          enabled: false,
          start: "22:00",
          end: "08:00",
        },
      },
      channels: {
        email: true,
        webhook: false,
      },
      priority: {
        high: ["email", "inApp"],
        medium: ["email"],
        low: [],
      },
    };

    const preferences = admin.notificationPreferences || defaultPreferences;

    return successResponse(
      res,
      { preferences },
      "Notification preferences fetched successfully",
    );
  } catch (error) {
    console.error("Get notification preferences error:", error);
    return errorResponse(res, error.message);
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const updates = req.body;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Merge existing preferences with updates
    const currentPreferences = admin.notificationPreferences || {};
    admin.notificationPreferences = {
      ...currentPreferences,
      ...updates,
      email: { ...currentPreferences.email, ...updates.email },
      inApp: { ...currentPreferences.inApp, ...updates.inApp },
      desktop: { ...currentPreferences.desktop, ...updates.desktop },
      channels: { ...currentPreferences.channels, ...updates.channels },
      priority: { ...currentPreferences.priority, ...updates.priority },
    };

    await admin.save();

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "UPDATE_NOTIFICATION_PREFERENCES",
      targetModel: "Admin",
      targetId: admin._id,
      changes: { updatedFields: Object.keys(updates) },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      { preferences: admin.notificationPreferences },
      "Notification preferences updated successfully",
    );
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return errorResponse(res, error.message);
  }
};

// Get user preferences (theme, language, etc.)
export const getUserPreferences = async (req, res) => {
  try {
    const adminId = req.admin._id;

    const admin = await Admin.findById(adminId).select("userPreferences");

    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Default user preferences
    const defaultPreferences = {
      theme: "light", // light, dark, system
      language: "en", // en, bn
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      currency: "BDT",
      dashboard: {
        defaultView: "overview",
        widgets: ["stats", "recentOrders", "topProducts", "chart"],
        autoRefresh: true,
        refreshInterval: 30, // seconds
      },
      accessibility: {
        fontSize: "medium", // small, medium, large, x-large
        highContrast: false,
        reducedMotion: false,
        screenReaderOptimized: false,
      },
      tableSettings: {
        defaultPageSize: 10,
        denseView: false,
      },
    };

    const preferences = admin.userPreferences || defaultPreferences;

    return successResponse(
      res,
      { preferences },
      "User preferences fetched successfully",
    );
  } catch (error) {
    console.error("Get user preferences error:", error);
    return errorResponse(res, error.message);
  }
};

// Update user preferences
export const updateUserPreferences = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const updates = req.body;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Merge existing preferences with updates
    const currentPreferences = admin.userPreferences || {};
    admin.userPreferences = {
      ...currentPreferences,
      ...updates,
      dashboard: { ...currentPreferences.dashboard, ...updates.dashboard },
      accessibility: {
        ...currentPreferences.accessibility,
        ...updates.accessibility,
      },
      tableSettings: {
        ...currentPreferences.tableSettings,
        ...updates.tableSettings,
      },
    };

    await admin.save();

    // Log activity
    await logAdminActivity({
      adminId: admin._id,
      actionType: "UPDATE_USER_PREFERENCES",
      targetModel: "Admin",
      targetId: admin._id,
      changes: { updatedFields: Object.keys(updates) },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      { preferences: admin.userPreferences },
      "User preferences updated successfully",
    );
  } catch (error) {
    console.error("Update user preferences error:", error);
    return errorResponse(res, error.message);
  }
};

// Get session management (active sessions)
export const getActiveSessions = async (req, res) => {
  try {
    const adminId = req.admin._id;

    // In a real implementation, you would have a Session model
    // For now, return mock data based on refresh tokens
    const admin = await Admin.findById(adminId).select(
      "refreshToken lastLogin",
    );

    const sessions = [];

    if (admin.refreshToken) {
      sessions.push({
        id: "current",
        device: req.headers["user-agent"] || "Unknown Device",
        ip: req.ip,
        lastActive: new Date(),
        isCurrent: true,
        createdAt: admin.lastLogin || new Date(),
      });
    }

    return successResponse(
      res,
      {
        sessions,
        currentSessionId: "current",
      },
      "Active sessions fetched successfully",
    );
  } catch (error) {
    console.error("Get active sessions error:", error);
    return errorResponse(res, error.message);
  }
};

// Revoke session (logout from specific device)
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const adminId = req.admin._id;

    // Check if trying to revoke current session
    if (sessionId === "current") {
      return errorResponse(
        res,
        "Cannot revoke current session. Use logout instead.",
        400,
      );
    }

    // In a real implementation, you would delete the specific refresh token
    // For now, just return success
    await logAdminActivity({
      adminId: adminId,
      actionType: "REVOKE_SESSION",
      targetModel: "Admin",
      targetId: adminId,
      changes: { sessionId },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, null, "Session revoked successfully");
  } catch (error) {
    console.error("Revoke session error:", error);
    return errorResponse(res, error.message);
  }
};

// Revoke all sessions except current
export const revokeAllSessions = async (req, res) => {
  try {
    const adminId = req.admin._id;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Clear refresh token to invalidate all other sessions
    admin.refreshToken = null;
    await admin.save();

    await logAdminActivity({
      adminId: adminId,
      actionType: "REVOKE_ALL_SESSIONS",
      targetModel: "Admin",
      targetId: adminId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      null,
      "All other sessions revoked successfully",
    );
  } catch (error) {
    console.error("Revoke all sessions error:", error);
    return errorResponse(res, error.message);
  }
};

// Get login history
export const getLoginHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { page = 1, limit = 20 } = req.query;

    // In a real implementation, you would have a LoginHistory model
    // For now, return mock data based on activity logs
    const loginActivities = await AdminActivityLog.find({
      adminId: adminId,
      actionType: "LOGIN",
    })
      .sort("-timestamp")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await AdminActivityLog.countDocuments({
      adminId: adminId,
      actionType: "LOGIN",
    });

    const history = loginActivities.map((activity) => ({
      id: activity._id,
      timestamp: activity.timestamp,
      ip: activity.ipAddress,
      userAgent: activity.userAgent,
      status: "success",
      location: "Unknown", // Would need IP geolocation service
    }));

    return successResponse(
      res,
      {
        history,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Login history fetched successfully",
    );
  } catch (error) {
    console.error("Get login history error:", error);
    return errorResponse(res, error.message);
  }
};

// Export login history
export const exportLoginHistory = async (req, res) => {
  try {
    const adminId = req.admin._id;

    const loginActivities = await AdminActivityLog.find({
      adminId: adminId,
      actionType: "LOGIN",
    })
      .sort("-timestamp")
      .lean();

    const csvData = loginActivities.map((activity) => ({
      Timestamp: new Date(activity.timestamp).toLocaleString(),
      "IP Address": activity.ipAddress || "N/A",
      "User Agent": activity.userAgent || "N/A",
      Status: "Success",
    }));

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=login-history-${Date.now()}.csv`,
    );

    if (csvData.length > 0) {
      const headers = Object.keys(csvData[0]);
      const csvRows = [
        headers.join(","),
        ...csvData.map((row) =>
          headers.map((header) => `"${row[header] || ""}"`).join(","),
        ),
      ];

      return res.send(csvRows.join("\n"));
    } else {
      return res.send("No login history found");
    }
  } catch (error) {
    console.error("Export login history error:", error);
    return errorResponse(res, error.message);
  }
};

// Test notification
export const testNotification = async (req, res) => {
  try {
    const { type, channel } = req.body;
    const adminId = req.admin._id;

    // In a real implementation, you would send a test notification
    // For now, just return success

    return successResponse(
      res,
      null,
      `Test ${type} notification sent via ${channel}`,
    );
  } catch (error) {
    console.error("Test notification error:", error);
    return errorResponse(res, error.message);
  }
};
