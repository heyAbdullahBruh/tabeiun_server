import Category from "../models/Category.model.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";
import { generateUniqueSlug } from "../utils/slugGenerator.js";

// Create Category
export const createCategory = async (req, res) => {
  try {
    const { name, description, metaTitle, metaDescription, keywords } =
      req.body;

    // Generate slug
    const slug = await generateUniqueSlug(Category, name);

    const category = await Category.create({
      name,
      slug,
      description,
      metaTitle: metaTitle || name,
      metaDescription: metaDescription || description,
      keywords: keywords || [],
    });

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "CREATE",
      targetModel: "Category",
      targetId: category._id,
      changes: { name },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      { category },
      "Category created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get All Categories
export const getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive, search } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await Category.find(filter)
      .sort("name")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Category.countDocuments(filter);

    return successResponse(res, {
      categories,
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

// Get Single Category
export const getCategory = async (req, res) => {
  try {
    const { slugOrId } = req.params;

    let category;
    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(slugOrId);
    } else {
      category = await Category.findOne({ slug: slugOrId });
    }

    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    // Get product count in this category
    const productCount = await Product.countDocuments({
      diseaseCategory: category._id,
      isPublished: true,
      isDeleted: false,
    });

    return successResponse(res, {
      category,
      productCount,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update Category
export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const updateData = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    // Update slug if name changed
    if (updateData.name && updateData.name !== category.name) {
      updateData.slug = await generateUniqueSlug(Category, updateData.name);
    }

    Object.assign(category, updateData);
    await category.save();

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "UPDATE",
      targetModel: "Category",
      targetId: category._id,
      changes: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, { category }, "Category updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Toggle Category Status
export const toggleCategoryStatus = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    category.isActive = !category.isActive;
    await category.save();

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "UPDATE",
      targetModel: "Category",
      targetId: category._id,
      changes: { isActive: category.isActive },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      {
        category: {
          id: category._id,
          name: category.name,
          isActive: category.isActive,
        },
      },
      `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete Category
export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Check if category has products
    const productCount = await Product.countDocuments({
      diseaseCategory: categoryId,
    });
    if (productCount > 0) {
      return errorResponse(
        res,
        "Cannot delete category with associated products",
        400,
      );
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "DELETE",
      targetModel: "Category",
      targetId: categoryId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, null, "Category deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
