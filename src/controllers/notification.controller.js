import Admin from "../models/Admin.model.js";
import {
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from "../services/ActivityLogService.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

// Get unread notifications for current admin
export const getNotifications = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { limit = 20, page = 1 } = req.query;

    const notifications = await getUnreadNotifications(
      adminId,
      parseInt(limit),
    );
    const total = await getUnreadNotificationCount(adminId);

    return successResponse(
      res,
      {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
        unreadCount: total,
      },
      "Notifications fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Mark single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const adminId = req.admin._id;

    await markNotificationAsRead(notificationId, adminId);

    return successResponse(res, null, "Notification marked as read");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const adminId = req.admin._id;

    await markAllNotificationsAsRead(adminId);

    return successResponse(res, null, "All notifications marked as read");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get unread notification count (for badge)
export const getUnreadCount = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const count = await getUnreadNotificationCount(adminId);

    return successResponse(res, { count }, "Unread count fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get notification settings
export const getNotificationSettings = async (req, res) => {
  try {
    const adminId = req.admin._id;

    // Get notification preferences from admin model
    const admin = await Admin.findById(adminId).select(
      "notificationPreferences",
    );

    const settings = admin?.notificationPreferences || {
      email: {
        orderNotifications: true,
        newUserAlerts: true,
        lowStockAlerts: true,
        systemUpdates: true,
      },
      inApp: {
        realTimeOrders: true,
        adminActions: true,
        systemAlerts: true,
      },
      desktop: {
        enabled: true,
        sound: true,
      },
    };

    return successResponse(
      res,
      { settings },
      "Notification settings fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update notification settings
export const updateNotificationSettings = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const updates = req.body;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    admin.notificationPreferences = {
      ...admin.notificationPreferences,
      ...updates,
    };

    await admin.save();

    return successResponse(
      res,
      { settings: admin.notificationPreferences },
      "Notification settings updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
