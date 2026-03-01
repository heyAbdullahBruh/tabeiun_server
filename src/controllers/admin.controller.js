import Admin, { AdminRole } from "../models/Admin.model.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";
import bcrypt from "bcrypt";

// Create Moderator (Admin only)
export const createModerator = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if email exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return errorResponse(res, "Email already registered", 400);
    }

    // Create moderator
    const moderator = await Admin.create({
      name,
      email,
      password,
      role: AdminRole.MODERATOR,
    });

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "CREATE_MODERATOR",
      targetModel: "Admin",
      targetId: moderator._id,
      changes: { name, email, role: AdminRole.MODERATOR },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      {
        moderator: {
          id: moderator._id,
          name: moderator.name,
          email: moderator.email,
          role: moderator.role,
          isActive: moderator.isActive,
        },
      },
      "Moderator created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Promote Moderator to Admin
export const promoteToAdmin = async (req, res) => {
  try {
    const { moderatorId } = req.params;

    const moderator = await Admin.findById(moderatorId);
    if (!moderator) {
      return errorResponse(res, "Moderator not found", 404);
    }

    if (moderator.role === AdminRole.ADMIN) {
      return errorResponse(res, "User is already an admin", 400);
    }

    const oldRole = moderator.role;
    moderator.role = AdminRole.ADMIN;
    await moderator.save();

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "PROMOTE_ADMIN",
      targetModel: "Admin",
      targetId: moderator._id,
      changes: { oldRole, newRole: AdminRole.ADMIN },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      {
        moderator: {
          id: moderator._id,
          name: moderator.name,
          email: moderator.email,
          role: moderator.role,
        },
      },
      "Moderator promoted to admin successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get All Admins/Moderators
export const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const admins = await Admin.find(filter)
      .select("-password -refreshToken")
      .sort("-createdAt")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Admin.countDocuments(filter);

    return successResponse(res, {
      admins,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Toggle Admin Status
export const toggleAdminStatus = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Prevent self-deactivation
    if (admin._id.toString() === req.admin._id.toString()) {
      return errorResponse(res, "Cannot change your own status", 400);
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: admin.isActive ? "ACTIVATE_ADMIN" : "DEACTIVATE_ADMIN",
      targetModel: "Admin",
      targetId: admin._id,
      changes: { isActive: admin.isActive },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          isActive: admin.isActive,
        },
      },
      `Admin ${admin.isActive ? "activated" : "deactivated"} successfully`,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete Admin (soft delete)
export const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    // Prevent self-deletion
    if (admin._id.toString() === req.admin._id.toString()) {
      return errorResponse(res, "Cannot delete your own account", 400);
    }

    await admin.deleteOne();

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "DELETE",
      targetModel: "Admin",
      targetId: admin._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, null, "Admin deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
