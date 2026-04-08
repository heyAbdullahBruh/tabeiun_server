import AdminActivityLog from "../models/AdminActivityLog.model.js";
import mongoose from "mongoose";

/**
 * Log admin activity for audit trail
 * @param {Object} logData - Activity log data
 * @param {string} logData.adminId - Admin ID
 * @param {string} logData.actionType - Type of action (CREATE, UPDATE, DELETE, etc.)
 * @param {string} logData.targetModel - Target model name (Product, Category, etc.)
 * @param {string} logData.targetId - Target document ID
 * @param {Object} logData.changes - Changes made (optional)
 * @param {string} logData.ipAddress - IP address of admin
 * @param {string} logData.userAgent - User agent of admin's browser
 */

// Store notification service reference
let notificationService = null;

export const setNotificationService = (service) => {
  notificationService = service;
};

export const logAdminActivity = async (logData) => {
  try {
    const {
      adminId,
      actionType,
      targetModel,
      targetId,
      changes = null,
      ipAddress = null,
      userAgent = null,
    } = logData;

    // Validate required fields
    if (!adminId || !actionType || !targetModel || !targetId) {
      console.error("Missing required fields for activity log:", {
        adminId,
        actionType,
        targetModel,
        targetId,
      });
      return null;
    }

    // Create activity log
    const activityLog = await AdminActivityLog.create({
      adminId: new mongoose.Types.ObjectId(adminId),
      actionType,
      targetModel,
      targetId: new mongoose.Types.ObjectId(targetId),
      changes,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      isNotified: false,
      isRead: false,
    });

    // Trigger real-time notification
    if (notificationService) {
      await notificationService.createAndSendNotification(activityLog);
    }

    return activityLog;
  } catch (error) {
    console.error("Failed to log admin activity:", error.message);
    return null;
  }
};
/**
 * Get activity logs with filtering and pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string} options.adminId - Filter by admin ID
 * @param {string} options.actionType - Filter by action type
 * @param {string} options.targetModel - Filter by target model
 * @param {Date} options.startDate - Start date for filtering
 * @param {Date} options.endDate - End date for filtering
 */
export const getActivityLogs = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      adminId = null,
      actionType = null,
      targetModel = null,
      startDate = null,
      endDate = null,
    } = options;

    const filter = {};

    if (adminId) {
      filter.adminId = new mongoose.Types.ObjectId(adminId);
    }

    if (actionType) {
      filter.actionType = actionType;
    }

    if (targetModel) {
      filter.targetModel = targetModel;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const logs = await AdminActivityLog.find(filter)
      .populate("adminId", "name email role")
      .sort("-timestamp")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await AdminActivityLog.countDocuments(filter);

    return {
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch activity logs: ${error.message}`);
  }
};

/**
 * Get activity summary for dashboard
 * @param {Object} options - Options for summary
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 */
export const getActivitySummary = async (options = {}) => {
  try {
    const {
      startDate = new Date(new Date().setHours(0, 0, 0, 0)),
      endDate = new Date(),
    } = options;

    const summary = await AdminActivityLog.aggregate([
      {
        $match: {
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            actionType: "$actionType",
            targetModel: "$targetModel",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.targetModel",
          actions: {
            $push: {
              actionType: "$_id.actionType",
              count: "$count",
            },
          },
          totalActions: { $sum: "$count" },
        },
      },
      {
        $sort: { totalActions: -1 },
      },
    ]);

    // Get recent activities
    const recentActivities = await AdminActivityLog.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("adminId", "name email")
      .sort("-timestamp")
      .limit(10)
      .lean();

    // Get action counts by admin
    const adminActions = await AdminActivityLog.aggregate([
      {
        $match: {
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$adminId",
          actionCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "_id",
          foreignField: "_id",
          as: "admin",
        },
      },
      { $unwind: "$admin" },
      {
        $project: {
          adminName: "$admin.name",
          adminEmail: "$admin.email",
          actionCount: 1,
        },
      },
      { $sort: { actionCount: -1 } },
      { $limit: 5 },
    ]);

    return {
      summary,
      recentActivities,
      topActiveAdmins: adminActions,
      totalActivities: await AdminActivityLog.countDocuments({
        timestamp: { $gte: startDate, $lte: endDate },
      }),
    };
  } catch (error) {
    throw new Error(`Failed to fetch activity summary: ${error.message}`);
  }
};

/**
 * Get activity logs for a specific admin
 * @param {string} adminId - Admin ID
 * @param {Object} options - Pagination options
 */
export const getAdminActivityLogs = async (adminId, options = {}) => {
  try {
    const { page = 1, limit = 20, startDate = null, endDate = null } = options;

    const filter = {
      adminId: new mongoose.Types.ObjectId(adminId),
    };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const logs = await AdminActivityLog.find(filter)
      .sort("-timestamp")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await AdminActivityLog.countDocuments(filter);

    return {
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch admin activity logs: ${error.message}`);
  }
};

const getCutoffDate = (period) => {
  if (period === "all") return null;

  const cutoffDate = new Date();

  switch (period) {
    case "day":
      cutoffDate.setDate(cutoffDate.getDate() - 1);
      break;
    case "week":
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      break;
    case "15days":
      cutoffDate.setDate(cutoffDate.getDate() - 15);
      break;
    case "month":
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    case "6months":
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
      break;
    case "year":
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      break;
    default:
      throw new Error(
        "Invalid period. Use: day, week, 15days, month, 6months, year, or all",
      );
  }

  return cutoffDate;
};

/**
 * Delete activity logs by time period
 * @param {string} period - 'day', 'week', '15days', 'month', '6months', 'year', 'all'
 * @returns {Promise<Object>} - Result with deleted count
 */
export const deleteActivityLogsByPeriod = async (period) => {
  try {
    const validPeriods = [
      "day",
      "week",
      "15days",
      "month",
      "6months",
      "year",
      "all",
    ];

    if (!validPeriods.includes(period)) {
      throw new Error(
        "Invalid period. Use: day, week, 15days, month, 6months, year, or all",
      );
    }

    let result;

    if (period === "all") {
      // Delete all activity logs
      result = await AdminActivityLog.deleteMany({});
      console.log(`Deleted all ${result.deletedCount} activity logs`);
    } else {
      // Delete by period
      const cutoffDate = getCutoffDate(period);
      result = await AdminActivityLog.deleteMany({
        timestamp: { $lt: cutoffDate },
      });
      console.log(
        `Deleted ${result.deletedCount} activity logs older than ${period}`,
      );
    }

    return {
      success: true,
      deletedCount: result.deletedCount,
      period: period,
      cutoffDate: period === "all" ? null : getCutoffDate(period),
    };
  } catch (error) {
    throw new Error(`Failed to delete activity logs: ${error.message}`);
  }
};

/**
 * Delete single activity log by ID
 * @param {string} logId - Activity log ID
 * @returns {Promise<Object>} - Deleted log details
 */
export const deleteActivityLogById = async (logId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(logId)) {
      throw new Error("Invalid log ID format");
    }

    const deletedLog = await AdminActivityLog.findByIdAndDelete(logId);

    if (!deletedLog) {
      throw new Error("Activity log not found");
    }

    return {
      success: true,
      deletedLog: deletedLog,
      deletedLogId: logId,
    };
  } catch (error) {
    throw new Error(`Failed to delete activity log: ${error.message}`);
  }
};

/**
 * Delete multiple activity logs by IDs
 * @param {Array<string>} logIds - Array of activity log IDs
 * @returns {Promise<Object>} - Result with deleted count
 */
export const deleteMultipleActivityLogs = async (logIds) => {
  try {
    if (!Array.isArray(logIds) || logIds.length === 0) {
      throw new Error("Please provide an array of log IDs");
    }

    // Validate all IDs
    const invalidIds = logIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    if (invalidIds.length > 0) {
      throw new Error(`Invalid log ID format for: ${invalidIds.join(", ")}`);
    }

    const result = await AdminActivityLog.deleteMany({
      _id: { $in: logIds },
    });

    return {
      success: true,
      deletedCount: result.deletedCount,
      deletedIds: logIds,
    };
  } catch (error) {
    throw new Error(
      `Failed to delete multiple activity logs: ${error.message}`,
    );
  }
};

/**
 * Get activity log statistics by date range
 * @param {string} period - 'day', 'week', 'month', 'year'
 * @returns {Promise<Object>} - Statistics about activity logs
 */
export const getActivityLogStats = async (period = "month") => {
  try {
    const cutoffDate = getCutoffDate(
      period === "day"
        ? "day"
        : period === "week"
          ? "week"
          : period === "month"
            ? "month"
            : "year",
    );

    const stats = await AdminActivityLog.aggregate([
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          byActionType: [
            {
              $group: {
                _id: "$actionType",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          byAdmin: [
            {
              $group: {
                _id: "$adminId",
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "admins",
                localField: "_id",
                foreignField: "_id",
                as: "adminInfo",
              },
            },
            { $unwind: "$adminInfo" },
            {
              $project: {
                adminName: "$adminInfo.name",
                adminEmail: "$adminInfo.email",
                count: 1,
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
          oldLogsCount: [
            {
              $match: {
                timestamp: { $lt: cutoffDate },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    return {
      success: true,
      stats: {
        total: stats[0].totalCount[0]?.count || 0,
        byActionType: stats[0].byActionType,
        topAdmins: stats[0].byAdmin,
        logsOlderThanPeriod: stats[0].oldLogsCount[0]?.count || 0,
      },
      period,
    };
  } catch (error) {
    throw new Error(`Failed to get activity log stats: ${error.message}`);
  }
};

/**
 * Cleanup old logs automatically based on retention policy
 * @param {string} retentionPeriod - 'month', '6months', 'year'
 * @returns {Promise<Object>} - Cleanup result
 */
export const autoCleanupActivityLogs = async (retentionPeriod = "6months") => {
  try {
    const validPeriods = ["month", "6months", "year"];

    if (!validPeriods.includes(retentionPeriod)) {
      throw new Error("Invalid retention period. Use: month, 6months, or year");
    }

    const cutoffDate = getCutoffDate(retentionPeriod);
    const result = await AdminActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    console.log(
      `Auto cleanup: Deleted ${result.deletedCount} logs older than ${retentionPeriod}`,
    );

    return {
      success: true,
      deletedCount: result.deletedCount,
      retentionPeriod: retentionPeriod,
      cutoffDate: cutoffDate,
    };
  } catch (error) {
    throw new Error(`Failed to auto cleanup activity logs: ${error.message}`);
  }
};

/**
 * Get activity log by ID
 * @param {string} logId - Activity log ID
 */
export const getActivityLogById = async (logId) => {
  try {
    const log = await AdminActivityLog.findById(logId)
      .populate("adminId", "name email role")
      .lean();

    if (!log) {
      throw new Error("Activity log not found");
    }

    return log;
  } catch (error) {
    throw new Error(`Failed to fetch activity log: ${error.message}`);
  }
};

/**
 * Export activity logs as CSV
 * @param {Object} filter - Filter options
 */
export const exportActivityLogsToCSV = async (filter = {}) => {
  try {
    const logs = await AdminActivityLog.find(filter)
      .populate("adminId", "name email")
      .sort("-timestamp")
      .lean();

    // Format logs for CSV export
    const formattedLogs = logs.map((log) => ({
      "Admin Name": log.adminId?.name || "Unknown",
      "Admin Email": log.adminId?.email || "Unknown",
      "Action Type": log.actionType,
      "Target Model": log.targetModel,
      "Target ID": log.targetId,
      Changes: log.changes ? JSON.stringify(log.changes) : "N/A",
      "IP Address": log.ipAddress || "N/A",
      "User Agent": log.userAgent || "N/A",
      Timestamp: new Date(log.timestamp).toISOString(),
    }));

    return formattedLogs;
  } catch (error) {
    throw new Error(`Failed to export activity logs: ${error.message}`);
  }
};
export const getUnreadNotifications = async (adminId, limit = 20) => {
  try {
    const notifications = await AdminActivityLog.find({
      adminId: new mongoose.Types.ObjectId(adminId),
      isNotified: true,
      isRead: { $ne: true },
    })
      .sort("-timestamp")
      .limit(limit)
      .populate("adminId", "name email")
      .lean();
    console.log("Fetched notifications:", notifications);
    return notifications;
  } catch (error) {
    console.error("Failed to fetch unread notifications:", error);
    return [];
  }
};

export const getAllNotifications = async (adminId, limit = 20) => {
  try {
    const notifications = await AdminActivityLog.find({
      adminId: { $ne: new mongoose.Types.ObjectId(adminId) },
      isNotified: true,
      isRead: { $ne: true },
    })
      .sort("-timestamp")
      .limit(limit)
      .populate("adminId", "name email")
      .lean();

    return notifications;
  } catch (error) {
    console.error("Failed to fetch unread notifications:", error);
    return [];
  }
};

// New function to mark notification as read
export const markNotificationAsRead = async (notificationId, adminId) => {
  try {
    await AdminActivityLog.findByIdAndUpdate(notificationId, {
      isRead: true,
      readAt: new Date(),
      readBy: new mongoose.Types.ObjectId(adminId),
    });
    return true;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return false;
  }
};

// New function to mark all notifications as read
export const markAllNotificationsAsRead = async (adminId) => {
  try {
    await AdminActivityLog.updateMany(
      {
        adminId: { $ne: new mongoose.Types.ObjectId(adminId) },
        isNotified: true,
        isRead: { $ne: true },
      },
      {
        isRead: true,
        readAt: new Date(),
        readBy: new mongoose.Types.ObjectId(adminId),
      },
    );
    return true;
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return false;
  }
};

// New function to get unread count
export const getUnreadNotificationCount = async (adminId) => {
  try {
    const count = await AdminActivityLog.countDocuments({
      adminId: { $ne: new mongoose.Types.ObjectId(adminId) },
      isNotified: true,
      isRead: { $ne: true },
    });
    return count;
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
};

export default {
  logAdminActivity,
  getActivityLogs,
  getActivitySummary,
  getAdminActivityLogs,
  deleteActivityLogsByPeriod,
  deleteActivityLogById,
  deleteMultipleActivityLogs,
  getActivityLogStats,
  autoCleanupActivityLogs,
  getActivityLogById,
  exportActivityLogsToCSV,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  setNotificationService,
};
