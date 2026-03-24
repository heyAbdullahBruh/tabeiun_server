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
    });

    return activityLog;
  } catch (error) {
    // Don't throw error - just log to console
    // Activity logging should not break the main flow
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

/**
 * Clean up old activity logs (keep last 6 months)
 */
export const cleanupOldActivityLogs = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await AdminActivityLog.deleteMany({
      timestamp: { $lt: sixMonthsAgo },
    });

    console.log(`Cleaned up ${result.deletedCount} old activity logs`);
    return result;
  } catch (error) {
    console.error("Failed to cleanup activity logs:", error.message);
    throw new Error(`Failed to cleanup activity logs: ${error.message}`);
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

export default {
  logAdminActivity,
  getActivityLogs,
  getActivitySummary,
  getAdminActivityLogs,
  cleanupOldActivityLogs,
  getActivityLogById,
  exportActivityLogsToCSV,
};
