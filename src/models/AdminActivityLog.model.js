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
});

// Index for filtering by date range
activityLogSchema.index({ timestamp: -1, adminId: 1 });

const AdminActivityLog = mongoose.model("AdminActivityLog", activityLogSchema);
export default AdminActivityLog;
