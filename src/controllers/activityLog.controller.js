// src/controllers/activityLog.controller.js
import {
  getActivityLogs,
  getActivitySummary,
  getAdminActivityLogs,
  getActivityLogById,
  exportActivityLogsToCSV,
  deleteActivityLogsByPeriod,
  deleteActivityLogById,
  deleteMultipleActivityLogs,
  getActivityLogStats,
  autoCleanupActivityLogs,
} from "../services/ActivityLogService.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";

// Get activity logs with pagination
export const getAllActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      adminId,
      actionType,
      targetModel,
      startDate,
      endDate,
    } = req.query;

    const result = await getActivityLogs({
      page,
      limit,
      adminId,
      actionType,
      targetModel,
      startDate,
      endDate,
    });

    return paginationResponse(
      res,
      result.data,
      result.pagination.total,
      page,
      limit,
      "Activity logs fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get activity summary for dashboard
export const getActivitySummaries = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await getActivitySummary({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return successResponse(
      res,
      summary,
      "Activity summary fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get activity logs for specific admin
export const AdminActivityLogs = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const result = await getAdminActivityLogs(adminId, {
      page,
      limit,
      startDate,
      endDate,
    });

    return paginationResponse(
      res,
      result.data,
      result.pagination.total,
      page,
      limit,
      "Admin activity logs fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get single activity log by ID
export const ActivityLogById = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await getActivityLogById(logId);

    return successResponse(res, { log }, "Activity log fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Export activity logs to CSV
export const exportActivityLogs = async (req, res) => {
  try {
    const { adminId, actionType, targetModel, startDate, endDate } = req.query;

    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (actionType) filter.actionType = actionType;
    if (targetModel) filter.targetModel = targetModel;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await exportActivityLogsToCSV(filter);

    // Set CSV headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=activity-logs-${Date.now()}.csv`,
    );

    // Convert to CSV
    if (logs.length > 0) {
      const headers = Object.keys(logs[0]);
      const csvRows = [
        headers.join(","),
        ...logs.map((log) =>
          headers.map((header) => JSON.stringify(log[header] || "")).join(","),
        ),
      ];

      return res.send(csvRows.join("\n"));
    } else {
      return res.send("No data found");
    }
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete activity logs by time period
export const deleteActivityLogsByPeriodController = async (req, res) => {
  try {
    const { period } = req.params;

    const result = await deleteActivityLogsByPeriod(period);

    return successResponse(
      res,
      result,
      `Successfully deleted ${result.deletedCount} activity logs`,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete single activity log by ID
export const deleteActivityLogByIdController = async (req, res) => {
  try {
    const { logId } = req.params;

    const result = await deleteActivityLogById(logId);

    return successResponse(res, result, "Activity log deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete multiple activity logs
export const deleteMultipleActivityLogsController = async (req, res) => {
  try {
    const { logIds } = req.body;

    const result = await deleteMultipleActivityLogs(logIds);

    return successResponse(
      res,
      result,
      `${result.deletedCount} activity logs deleted successfully`,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get activity log statistics
export const getActivityLogStatsController = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    const stats = await getActivityLogStats(period);

    return successResponse(
      res,
      stats,
      "Activity log statistics fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Auto cleanup activity logs
export const autoCleanupActivityLogsController = async (req, res) => {
  try {
    const { retentionPeriod = "6months" } = req.body;

    const result = await autoCleanupActivityLogs(retentionPeriod);

    return successResponse(
      res,
      result,
      `Auto cleanup completed. Deleted ${result.deletedCount} logs`,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
