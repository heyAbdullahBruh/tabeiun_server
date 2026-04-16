import User from "../models/User.model.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";
import { uploadToImageKit } from "../config/imagekit.js";
import { logAdminActivity } from "../services/ActivityLogService.js";
import Order from "../models/Order.model.js";
import mongoose from "mongoose";

// Update User Profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) {
      user.address = {
        ...user.address,
        ...address,
      };
    }

    await user.save();

    return successResponse(res, { user }, "Profile updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update User Avatar
export const updateUserAvatar = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return errorResponse(res, "No image uploaded", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Upload new avatar
    const result = await uploadToImageKit(
      file,
      "users/avatars",
      `avatar-${userId}`,
    );

    // Update user avatar
    user.avatar = result.url;
    await user.save();

    return successResponse(
      res,
      {
        user: {
          ...user.toObject(),
          avatar: result.url,
        },
      },
      "Avatar updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get User Orders (summary)
export const getUserOrderSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const orderStats = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" },
        },
      },
    ]);

    const recentOrders = await Order.find({ user: userId })
      .sort("-createdAt")
      .limit(5)
      .select("orderId finalAmount status createdAt");

    return successResponse(res, {
      orderStats,
      recentOrders,
      totalOrders: await Order.countDocuments({ user: userId }),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get User Addresses
export const getUserAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("address");
    return successResponse(res, { addresses: user.address || {} });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Add/Update Address
export const updateAddress = async (req, res) => {
  try {
    const { address } = req.body;
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { address } },
      { new: true },
    ).select("address");

    return successResponse(
      res,
      { address: user.address },
      "Address updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isBlocked } = req.query;

    const filter = {};
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select("-__v");

    const total = await User.countDocuments(filter);

    return paginationResponse(
      res,
      users,
      total,
      page,
      limit,
      "Users fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Get Single User
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-__v");
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Get user order statistics
    const orderStats = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$finalAmount" },
          avgOrderValue: { $avg: "$finalAmount" },
        },
      },
    ]);

    return successResponse(res, {
      user,
      stats: orderStats[0] || {
        totalOrders: 0,
        totalSpent: 0,
        avgOrderValue: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return errorResponse(res, error.message);
  }
};

// Admin: Toggle User Block Status
export const toggleUserBlock = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: user.isBlocked ? "BLOCK_USER" : "UNBLOCK_USER",
      targetModel: "User",
      targetId: user._id,
      changes: { isBlocked: user.isBlocked },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isBlocked: user.isBlocked,
        },
      },
      `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Get User Orders with pagination
export const getUserOrdersByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = "-createdAt",
    } = req.query;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Build filter
    const filter = { user: new mongoose.Types.ObjectId(userId) };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get orders with pagination
    const orders = await Order.find(filter)
      .populate("products.product", "name slug images price")
      .sort(sortBy)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get order statistics
    const stats = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" },
        },
      },
    ]);

    // Get total spent
    const totalSpent = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: "Delivered",
        },
      },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]);

    const total = await Order.countDocuments(filter);

    // Format order status distribution
    const statusDistribution = {};
    stats.forEach((stat) => {
      statusDistribution[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount,
      };
    });

    return paginationResponse(
      res,
      {
        orders,
        stats: {
          totalOrders: await Order.countDocuments({ user: userId }),
          totalSpent: totalSpent[0]?.total || 0,
          averageOrderValue:
            totalSpent[0]?.total /
              (await Order.countDocuments({
                user: userId,
                status: "Delivered",
              })) || 0,
          statusDistribution,
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isBlocked: user.isBlocked,
          createdAt: user.createdAt,
        },
      },
      total,
      page,
      limit,
      "User orders fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Get User Order Summary (quick stats)
export const getUserOrderSummaryByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      "name email phone isBlocked",
    );
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Get order statistics
    const [
      totalOrders,
      totalSpent,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      lastOrder,
      monthlyStats,
    ] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            status: "Delivered",
          },
        },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),
      Order.countDocuments({ user: userId, status: "Pending" }),
      Order.countDocuments({ user: userId, status: "Delivered" }),
      Order.countDocuments({ user: userId, status: "Cancelled" }),
      Order.findOne({ user: userId })
        .sort("-createdAt")
        .select("orderId finalAmount status createdAt"),
      Order.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            orders: { $sum: 1 },
            spent: { $sum: "$finalAmount" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 6 },
      ]),
    ]);

    return successResponse(
      res,
      {
        user,
        orderStats: {
          totalOrders,
          totalSpent: totalSpent[0]?.total || 0,
          pendingOrders,
          deliveredOrders,
          cancelledOrders,
          lastOrder,
          monthlyStats: monthlyStats.map((stat) => ({
            year: stat._id.year,
            month: stat._id.month,
            orders: stat.orders,
            spent: stat.spent,
          })),
        },
      },
      "User order summary fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Admin: Export User Orders to CSV
export const exportUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, status } = req.query;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Build filter
    const filter = { user: new mongoose.Types.ObjectId(userId) };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get orders
    const orders = await Order.find(filter)
      .populate("products.product", "name")
      .sort("-createdAt")
      .lean();

    // Format data for CSV
    const csvData = [];
    orders.forEach((order) => {
      order.products.forEach((product) => {
        csvData.push({
          "Order ID": order.orderId,
          "Order Date": new Date(order.createdAt).toLocaleDateString("bn-BD"),
          "Product Name": product.product?.name || "N/A",
          Quantity: product.quantity,
          "Unit Price": product.priceAtPurchase,
          Total: product.quantity * product.priceAtPurchase,
          "Order Status": order.status,
          "Final Amount": order.finalAmount,
          "Payment Method": order.paymentMethod,
          "Delivery Address": `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
          Phone: order.phone,
        });
      });
    });

    // Set CSV headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=user-${user.email}-orders-${Date.now()}.csv`,
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
      return res.send("No orders found for this user");
    }
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
// Simple CSV Only Version - No xlsx package needed
export const exportUsers = async (req, res) => {
  try {
    const { period, startDate, endDate, status, provider } = req.query;

    // Build filter (same as above)
    const filter = {};

    if (period && period !== "custom" && period !== "all") {
      const dateRange = getUserDateRangeFromPeriod(period);
      if (dateRange) {
        filter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
      }
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (status === "blocked") filter.isBlocked = true;
    else if (status === "active") filter.isBlocked = false;

    if (provider && provider !== "all") filter.provider = provider;

    const users = await User.find(filter).sort("-createdAt").lean();

    if (!users.length) {
      return errorResponse(res, "No users found to export", 404);
    }

    // Get order stats
    const userIds = users.map((u) => u._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      {
        $group: {
          _id: "$user",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$finalAmount" },
        },
      },
    ]);

    const statsMap = {};
    orderStats.forEach((stat) => {
      statsMap[stat._id.toString()] = stat;
    });

    // CSV Headers
    const headers = [
      "User ID",
      "Name",
      "Email",
      "Phone",
      "Provider",
      "Email Verified",
      "Has Set Password",
      "Status",
      "Registration Date",
      "Last Login",
      "Total Orders",
      "Total Spent",
      "Average Order Value",
      "Address",
    ];

    // CSV Rows
    const rows = users.map((user) => {
      const stats = statsMap[user._id.toString()] || {};
      const avgOrderValue = stats.totalOrders
        ? (stats.totalSpent / stats.totalOrders).toFixed(2)
        : 0;

      const address = user.address
        ? `${user.address.street || ""}, ${user.address.city || ""}, ${user.address.state || ""}, ${user.address.postalCode || ""}, ${user.address.country || "Bangladesh"}`
            .replace(/,\s*,/g, ",")
            .replace(/^,\s*/, "")
        : "N/A";

      return [
        user._id.toString(),
        user.name,
        user.email,
        user.phone || "N/A",
        user.provider === "google"
          ? "Google"
          : user.provider === "facebook"
            ? "Facebook"
            : "Email",
        user.isEmailVerified ? "Yes" : "No",
        user.hasSetPassword ? "Yes" : "No",
        user.isBlocked ? "Blocked" : "Active",
        new Date(user.createdAt).toLocaleString(),
        user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never",
        stats.totalOrders || 0,
        stats.totalSpent || 0,
        avgOrderValue,
        address,
      ];
    });

    // Build CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const date = new Date();
    const filename = `users_${period || "export"}_${date.toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    return res.send(csvContent);
  } catch (error) {
    console.error("Export users error:", error);
    return errorResponse(res, error.message);
  }
};
