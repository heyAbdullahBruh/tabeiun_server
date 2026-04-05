import AdminActivityLog from "../models/AdminActivityLog.model.js";
import Admin from "../models/Admin.model.js";

class NotificationService {
  constructor(io) {
    this.io = io;
    this.connectedAdmins = new Map(); // adminId -> socketId
  }

  // Initialize socket connection for an admin
  initializeAdminConnection(adminId, socketId) {
    this.connectedAdmins.set(adminId.toString(), socketId);
    console.log(`✅ Admin ${adminId} connected with socket ${socketId}`);
  }

  // Remove admin connection
  removeAdminConnection(adminId) {
    this.connectedAdmins.delete(adminId.toString());
    console.log(`❌ Admin ${adminId} disconnected`);
  }

  // Send notification to specific admin
  sendToAdmin(adminId, notification) {
    const socketId = this.connectedAdmins.get(adminId.toString());
    if (socketId && this.io) {
      this.io.to(socketId).emit("new-notification", notification);
      return true;
    }
    return false;
  }

  // Send notification to all connected admins
  sendToAllAdmins(notification) {
    if (this.io) {
      this.io.emit("new-notification", notification);
      return true;
    }
    return false;
  }

  // Send notification to admins with specific role
  sendToRole(role, notification) {
    // This would require tracking roles per socket
    // Alternative: broadcast to all and let client filter
    this.sendToAllAdmins(notification);
  }

  // Create and send notification from activity log
  async createAndSendNotification(activityLog) {
    try {
      // Format notification based on action type
      const notification = this.formatNotification(activityLog);

      // Get admin info for the notification
      const admin = await Admin.findById(activityLog.adminId).select(
        "name email role",
      );

      const enrichedNotification = {
        ...notification,
        adminName: admin?.name || "Unknown",
        adminRole: admin?.role || "Unknown",
        timestamp: activityLog.timestamp,
        read: false,
      };

      // Send to all connected admins
      this.sendToAllAdmins(enrichedNotification);

      // Store in database for history
      await this.storeNotification(activityLog, enrichedNotification);

      return enrichedNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  // Format notification based on activity type
  formatNotification(activityLog) {
    const { actionType, targetModel, changes, adminId } = activityLog;

    const templates = {
      CREATE: {
        Product: {
          title: "New Product Created",
          message: `A new product has been added to the inventory`,
          icon: "📦",
          color: "#10B981",
          type: "success",
        },
        Category: {
          title: "New Category Added",
          message: `A new category has been created`,
          icon: "🏷️",
          color: "#3B82F6",
          type: "info",
        },
        Order: {
          title: "New Order Received",
          message: `A new order has been placed`,
          icon: "🛒",
          color: "#8B5CF6",
          type: "warning",
        },
        User: {
          title: "New User Registered",
          message: `A new user has joined the platform`,
          icon: "👤",
          color: "#06B6D4",
          type: "info",
        },
        default: {
          title: "New Activity",
          message: `A new ${targetModel} was created`,
          icon: "📝",
          color: "#6B7280",
          type: "info",
        },
      },
      UPDATE: {
        Product: {
          title: "Product Updated",
          message: `A product has been modified`,
          icon: "✏️",
          color: "#F59E0B",
          type: "warning",
        },
        Order: {
          title: "Order Status Updated",
          message: `An order status has been changed`,
          icon: "🔄",
          color: "#F59E0B",
          type: "warning",
        },
        Category: {
          title: "Category Updated",
          message: `A category has been modified`,
          icon: "✏️",
          color: "#F59E0B",
          type: "warning",
        },
        default: {
          title: "Content Updated",
          message: `${targetModel} has been updated`,
          icon: "✏️",
          color: "#F59E0B",
          type: "warning",
        },
      },
      DELETE: {
        Product: {
          title: "Product Deleted",
          message: `A product has been removed from inventory`,
          icon: "🗑️",
          color: "#EF4444",
          type: "error",
        },
        Category: {
          title: "Category Deleted",
          message: `A category has been removed`,
          icon: "🗑️",
          color: "#EF4444",
          type: "error",
        },
        default: {
          title: "Content Deleted",
          message: `${targetModel} has been deleted`,
          icon: "🗑️",
          color: "#EF4444",
          type: "error",
        },
      },
      LOGIN: {
        title: "Admin Login",
        message: `An admin logged into the dashboard`,
        icon: "🔐",
        color: "#10B981",
        type: "success",
      },
      LOGOUT: {
        title: "Admin Logout",
        message: `An admin logged out of the dashboard`,
        icon: "🚪",
        color: "#6B7280",
        type: "info",
      },
      CONFIRM_ORDER: {
        title: "Order Confirmed",
        message: `An order has been confirmed`,
        icon: "✅",
        color: "#10B981",
        type: "success",
      },
      UPDATE_ORDER_STATUS: {
        title: "Order Status Changed",
        message: `Order status has been updated`,
        icon: "🔄",
        color: "#F59E0B",
        type: "warning",
      },
      PROMOTE_ADMIN: {
        title: "Admin Promotion",
        message: `A moderator was promoted to admin`,
        icon: "👑",
        color: "#8B5CF6",
        type: "success",
      },
      CREATE_MODERATOR: {
        title: "New Moderator Added",
        message: `A new moderator has been added to the team`,
        icon: "👥",
        color: "#3B82F6",
        type: "info",
      },
      BLOCK_USER: {
        title: "User Blocked",
        message: `A user has been blocked from the platform`,
        icon: "🚫",
        color: "#EF4444",
        type: "error",
      },
      UNBLOCK_USER: {
        title: "User Unblocked",
        message: `A user has been unblocked`,
        icon: "✅",
        color: "#10B981",
        type: "success",
      },
      LOW_STOCK_ALERT: {
        title: "⚠️ Low Stock Alert",
        message: `A product is running low on stock`,
        icon: "⚠️",
        color: "#EF4444",
        type: "error",
      },
    };

    // Get template for specific action and model
    let template =
      templates[actionType]?.[targetModel] ||
      templates[actionType]?.default ||
      templates[actionType];

    if (!template) {
      template = {
        title: "System Notification",
        message: `New activity: ${actionType} on ${targetModel}`,
        icon: "🔔",
        color: "#6B7280",
        type: "info",
      };
    }

    // Add specific details if changes exist
    let message = template.message;
    if (changes) {
      if (changes.name) {
        message = `${message}: ${changes.name}`;
      }
      if (changes.status) {
        message = `${message} to ${changes.status}`;
      }
    }

    return {
      id: activityLog._id,
      actionType,
      targetModel,
      targetId: activityLog.targetId,
      title: template.title,
      message,
      icon: template.icon,
      color: template.color,
      type: template.type,
      changes,
      timestamp: activityLog.timestamp,
    };
  }

  // Store notification in database
  async storeNotification(activityLog, notification) {
    try {
      // Create a notifications collection or use existing activity log
      // For now, we'll mark activity logs as notified
      await AdminActivityLog.findByIdAndUpdate(activityLog._id, {
        isNotified: true,
        notificationSentAt: new Date(),
      });
    } catch (error) {
      console.error("Error storing notification:", error);
    }
  }

  // Get unread notifications for an admin
  async getUnreadNotifications(adminId, limit = 20) {
    try {
      const notifications = await AdminActivityLog.find({
        adminId: { $ne: adminId }, // Exclude own activities
        isNotified: true,
        isRead: { $ne: true },
      })
        .sort("-timestamp")
        .limit(limit)
        .populate("adminId", "name email avatar")
        .lean();

      return notifications.map((log) => this.formatNotification(log));
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, adminId) {
    try {
      await AdminActivityLog.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date(),
        readBy: adminId,
      });
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  // Mark all notifications as read for an admin
  async markAllAsRead(adminId) {
    try {
      await AdminActivityLog.updateMany(
        {
          adminId: { $ne: adminId },
          isNotified: true,
          isRead: { $ne: true },
        },
        {
          isRead: true,
          readAt: new Date(),
          readBy: adminId,
        },
      );
      return true;
    } catch (error) {
      console.error("Error marking all as read:", error);
      return false;
    }
  }

  // Get notification count
  async getUnreadCount(adminId) {
    try {
      const count = await AdminActivityLog.countDocuments({
        adminId: { $ne: adminId },
        isNotified: true,
        isRead: { $ne: true },
      });
      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Send low stock alert
  async sendLowStockAlert(product) {
    const notification = {
      actionType: "LOW_STOCK_ALERT",
      targetModel: "Product",
      targetId: product._id,
      timestamp: new Date(),
      changes: {
        name: product.name,
        stock: product.stock,
        threshold: product.lowStockAlert,
      },
    };

    const formatted = this.formatNotification(notification);
    this.sendToAllAdmins(formatted);

    // Store in database
    await this.storeNotification(notification, formatted);

    return formatted;
  }

  // Send bulk notification
  async sendBulkNotification(title, message, type = "info") {
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      icon: this.getIconForType(type),
      color: this.getColorForType(type),
      type,
      timestamp: new Date(),
      isBulk: true,
    };

    this.sendToAllAdmins(notification);
    return notification;
  }

  getIconForType(type) {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };
    return icons[type] || "🔔";
  }

  getColorForType(type) {
    const colors = {
      success: "#10B981",
      error: "#EF4444",
      warning: "#F59E0B",
      info: "#3B82F6",
    };
    return colors[type] || "#6B7280";
  }
}

export default NotificationService;
