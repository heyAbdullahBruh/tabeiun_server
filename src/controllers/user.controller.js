import User from "../models/User.model.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";
import { uploadToImageKit, deleteFromImageKit } from "../config/imagekit.js";
import { logAdminActivity } from "../services/ActivityLogService.js";

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
      { $match: { user: mongoose.Types.ObjectId(userId) } },
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
      { $match: { user: mongoose.Types.ObjectId(userId) } },
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
