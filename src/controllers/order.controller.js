import Order, { OrderStatus } from "../models/Order.model.js";
import orderService from "../services/OrderService.js";
import emailService from "../services/EmailService.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";

// Create Order (User)
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const orderData = req.body;

    const order = await orderService.createOrder(userId, orderData);

    // Send emails
    await emailService.sendOrderConfirmationToCustomer(order, req.user);
    await emailService.sendOrderConfirmationToAdmin(order, req.user);

    return successResponse(res, { order }, "Order created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get User Orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await orderService.getUserOrders(userId, req.query);

    return paginationResponse(
      res,
      result.data,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      "Orders fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Single Order (User)
export const getUserOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    })
      .populate("products.product", "name slug images price")
      .populate("user", "name email phone");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    return successResponse(res, { order });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Cancel Order (User)
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const order = await orderService.cancelOrder(orderId, userId, reason);

    // Send email
    await emailService.sendOrderStatusUpdate(order, req.user, "Cancelled");

    return successResponse(res, { order }, "Order cancelled successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get All Orders (Admin/Moderator)
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate("user", "name email phone")
      .populate("products.product", "name slug")
      .populate("isConfirmedBy", "name email")
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments(filter);

    return paginationResponse(
      res,
      orders,
      total,
      page,
      limit,
      "Orders fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Single Order (Admin)
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "name email phone address")
      .populate("products.product", "name slug images price")
      .populate("isConfirmedBy", "name email")
      .populate("timelineLogs.updatedBy", "name email");

    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    return successResponse(res, { order });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Confirm Order (Admin/Moderator)
export const confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const adminId = req.admin._id;

    const order = await orderService.confirmOrder(orderId, adminId);

    // Get user for email
    const user = await User.findById(order.user);

    // Send email
    await emailService.sendOrderStatusUpdate(order, user, "Confirmed");

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "CONFIRM_ORDER",
      targetModel: "Order",
      targetId: order._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, { order }, "Order confirmed successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    const adminId = req.admin._id;

    const order = await orderService.updateOrderStatus(
      orderId,
      status,
      adminId,
      note,
    );

    // Get user for email
    const user = await User.findById(order.user);

    // Send email
    await emailService.sendOrderStatusUpdate(order, user, status);

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "UPDATE_ORDER_STATUS",
      targetModel: "Order",
      targetId: order._id,
      changes: { status, note },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, { order }, `Order status updated to ${status}`);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Order Statistics
export const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" },
        },
      },
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today },
    });

    const pendingOrders = await Order.countDocuments({
      status: OrderStatus.PENDING,
    });

    return successResponse(res, {
      byStatus: stats,
      todayOrders,
      pendingOrders,
      totalOrders: await Order.countDocuments(),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
