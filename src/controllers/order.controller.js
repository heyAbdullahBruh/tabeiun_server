import Order from "../models/Order.model.js";
import orderService from "../services/OrderService.js";
import emailService from "../services/EmailService.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";
import User from "../models/User.model.js";

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

// Track Order (User)
export const trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const trackingInfo = await orderService.trackOrder(orderId, userId);

    return successResponse(
      res,
      trackingInfo,
      "Order tracking information fetched successfully",
    );
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

// Add this function to existing order.controller.js

// Get Order Statistics for Admin Dashboard
export const getOrderStats = async (req, res) => {
  try {
    const { period = "today" } = req.query; // today, week, month, year, all

    let startDate;
    const now = new Date();

    // Calculate date range based on period
    switch (period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "all":
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get all statistics in parallel for better performance
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      todayOrders,
      thisWeekOrders,
      thisMonthOrders,
      averageOrderValue,
      statusBreakdown,
      dailyStats,
      topProducts,
      categoryBreakdown,
      paymentMethodStats,
    ] = await Promise.all([
      // Total orders count
      Order.countDocuments(),

      // Total revenue from delivered orders
      Order.aggregate([
        { $match: { status: "Delivered" } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),

      // Pending orders count
      Order.countDocuments({ status: "Pending" }),

      // Confirmed orders count
      Order.countDocuments({ status: "Confirmed" }),

      // Processing orders count
      Order.countDocuments({ status: "Processing" }),

      // Shipped orders count
      Order.countDocuments({ status: "Shipped" }),

      // Delivered orders count
      Order.countDocuments({ status: "Delivered" }),

      // Cancelled orders count
      Order.countDocuments({ status: "Cancelled" }),

      // Today's orders
      Order.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),

      // This week's orders
      Order.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      }),

      // This month's orders
      Order.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      }),

      // Average order value
      Order.aggregate([
        { $match: { status: "Delivered" } },
        { $group: { _id: null, avg: { $avg: "$finalAmount" } } },
      ]),

      // Status breakdown with counts and amounts
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$finalAmount" },
            averageAmount: { $avg: "$finalAmount" },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Daily stats for chart
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: "Delivered",
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            orders: { $sum: 1 },
            revenue: { $sum: "$finalAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        { $limit: 30 },
      ]),

      // Top 5 selling products
      Order.aggregate([
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.product",
            totalQuantity: { $sum: "$products.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: ["$products.quantity", "$products.priceAtPurchase"],
              },
            },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            productId: "$_id",
            name: "$product.name",
            slug: "$product.slug",
            image: { $arrayElemAt: ["$product.images.url", 0] },
            totalQuantity: 1,
            totalRevenue: 1,
            orderCount: 1,
          },
        },
      ]),

      // Category breakdown
      Order.aggregate([
        { $match: { status: "Delivered" } },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products",
            localField: "products.product",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $lookup: {
            from: "categories",
            localField: "productInfo.diseaseCategory",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        {
          $group: {
            _id: "$categoryInfo._id",
            categoryName: { $first: "$categoryInfo.name" },
            totalRevenue: {
              $sum: {
                $multiply: ["$products.quantity", "$products.priceAtPurchase"],
              },
            },
            totalQuantity: { $sum: "$products.quantity" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]),

      // Payment method statistics
      Order.aggregate([
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            totalAmount: { $sum: "$finalAmount" },
          },
        },
      ]),
    ]);

    // Calculate growth percentages
    const previousPeriodOrders = await Order.countDocuments({
      createdAt: {
        $lt: startDate,
        $gte: new Date(startDate.getTime() - (new Date() - startDate)),
      },
    });

    const orderGrowth =
      previousPeriodOrders > 0
        ? ((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100
        : 0;

    const previousPeriodRevenue = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          createdAt: {
            $lt: startDate,
            $gte: new Date(startDate.getTime() - (new Date() - startDate)),
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]);

    const revenueGrowth =
      (previousPeriodRevenue[0]?.total || 0) > 0
        ? (((totalRevenue[0]?.total || 0) -
            (previousPeriodRevenue[0]?.total || 0)) /
            (previousPeriodRevenue[0]?.total || 0)) *
          100
        : 0;

    // Prepare response data
    const stats = {
      overview: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        averageOrderValue: averageOrderValue[0]?.avg || 0,
        orderGrowth: Math.round(orderGrowth * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      },
      statusCounts: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      timeBased: {
        today: todayOrders,
        thisWeek: thisWeekOrders,
        thisMonth: thisMonthOrders,
      },
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
        averageAmount: item.averageAmount,
        percentage: ((item.count / totalOrders) * 100).toFixed(1),
      })),
      dailyStats: dailyStats.map((item) => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
        orders: item.orders,
        revenue: item.revenue,
      })),
      topProducts: topProducts.map((item) => ({
        id: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
        orderCount: item.orderCount,
      })),
      categoryBreakdown: categoryBreakdown.map((item) => ({
        id: item._id,
        name: item.categoryName,
        totalRevenue: item.totalRevenue,
        totalQuantity: item.totalQuantity,
        orderCount: item.orderCount,
        percentage: (
          (item.totalRevenue / (totalRevenue[0]?.total || 1)) *
          100
        ).toFixed(1),
      })),
      paymentMethods: paymentMethodStats.map((item) => ({
        method: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
        percentage: ((item.count / totalOrders) * 100).toFixed(1),
      })),
    };

    return successResponse(res, stats, "Order statistics fetched successfully");
  } catch (error) {
    console.error("Order stats error:", error);
    return errorResponse(res, error.message);
  }
};

// Get Order Analytics with Advanced Filters
export const getOrderAnalytics = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = "day", // day, week, month, year
      status,
      category,
      productId,
    } = req.query;

    // Build match stage
    const matchStage = {};

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    if (status) {
      matchStage.status = status;
    }

    // Get analytics data
    const analytics = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // Revenue over time
          revenueOverTime: [
            {
              $group: {
                _id: getGroupByFormat(groupBy),
                revenue: { $sum: "$finalAmount" },
                orders: { $sum: 1 },
                averageOrderValue: { $avg: "$finalAmount" },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Status distribution
          statusDistribution: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalAmount: { $sum: "$finalAmount" },
              },
            },
          ],

          // Hourly distribution (when orders are placed)
          hourlyDistribution: [
            {
              $group: {
                _id: { hour: { $hour: "$createdAt" } },
                orders: { $sum: 1 },
                revenue: { $sum: "$finalAmount" },
              },
            },
            { $sort: { "_id.hour": 1 } },
          ],

          // Day of week distribution
          dayOfWeekDistribution: [
            {
              $group: {
                _id: { dayOfWeek: { $dayOfWeek: "$createdAt" } },
                orders: { $sum: 1 },
                revenue: { $sum: "$finalAmount" },
              },
            },
            { $sort: { "_id.dayOfWeek": 1 } },
          ],

          // Customer acquisition metrics
          customerMetrics: [
            {
              $group: {
                _id: "$user",
                totalSpent: { $sum: "$finalAmount" },
                orderCount: { $sum: 1 },
                firstOrder: { $min: "$createdAt" },
                lastOrder: { $max: "$createdAt" },
              },
            },
            {
              $facet: {
                newCustomers: [
                  { $match: { orderCount: 1 } },
                  { $count: "count" },
                ],
                returningCustomers: [
                  { $match: { orderCount: { $gt: 1 } } },
                  { $count: "count" },
                ],
                totalCustomers: [{ $count: "count" }],
              },
            },
          ],

          // Average order value trend
          aovTrend: [
            {
              $group: {
                _id: getGroupByFormat(groupBy),
                aov: { $avg: "$finalAmount" },
                median: {
                  $median: { input: "$finalAmount", method: "approximate" },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    return successResponse(
      res,
      analytics[0],
      "Order analytics fetched successfully",
    );
  } catch (error) {
    console.error("Order analytics error:", error);
    return errorResponse(res, error.message);
  }
};

// Helper function for grouping by different time periods
const getGroupByFormat = (groupBy) => {
  switch (groupBy) {
    case "day":
      return {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    case "week":
      return {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
    case "month":
      return {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
    case "year":
      return {
        year: { $year: "$createdAt" },
      };
    default:
      return {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
  }
};

// Get Real-time Order Stats (for dashboard widgets)
export const getRealtimeOrderStats = async (req, res) => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      ordersLastHour,
      revenueLastHour,
      ordersLast24Hours,
      revenueLast24Hours,
      pendingOrders,
      processingOrders,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: lastHour } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: lastHour }, status: "Delivered" } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: last24Hours } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: last24Hours }, status: "Delivered" } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),
      Order.countDocuments({ status: "Pending" }),
      Order.countDocuments({ status: "Processing" }),
      Order.find({ status: { $in: ["Pending", "Processing"] } })
        .sort("-createdAt")
        .limit(5)
        .populate("user", "name")
        .select("orderId finalAmount status createdAt user"),
    ]);

    return successResponse(
      res,
      {
        lastHour: {
          orders: ordersLastHour,
          revenue: revenueLastHour[0]?.total || 0,
        },
        last24Hours: {
          orders: ordersLast24Hours,
          revenue: revenueLast24Hours[0]?.total || 0,
        },
        pendingOrders,
        processingOrders,
        recentOrders,
      },
      "Real-time stats fetched successfully",
    );
  } catch (error) {
    console.error("Real-time stats error:", error);
    return errorResponse(res, error.message);
  }
};
