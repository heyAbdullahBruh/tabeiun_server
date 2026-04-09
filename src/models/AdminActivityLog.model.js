import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
    index: true,
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      "CREATE",
      "UPDATE",
      "DELETE",
      "LOGIN",
      "LOGOUT",
      "CONFIRM_ORDER",
      "UPDATE_ORDER_STATUS",
      "PROMOTE_ADMIN",
      "CREATE_MODERATOR",
      "BLOCK_USER",
      "UNBLOCK_USER",
      "LOW_STOCK_ALERT",
      "BULK_NOTIFICATION",
      "RESET_PASSWORD",
      "FORGOT_PASSWORD",
      "CHANGE_PASSWORD",
    ],
  },
  targetModel: {
    type: String,
    enum: ["Product", "Category", "Order", "User", "Admin", "Review"],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // NEW NOTIFICATION FIELDS
  isNotified: {
    type: Boolean,
    default: false,
    index: true,
  },
  notificationSentAt: Date,
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: Date,
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
});

// Indexes for notification queries
activityLogSchema.index({ isNotified: 1, isRead: 1, timestamp: -1 });
activityLogSchema.index({ adminId: 1, isNotified: 1, isRead: 1 });

const AdminActivityLog = mongoose.model("AdminActivityLog", activityLogSchema);
export default AdminActivityLog;
