import Product from "../models/Product.model.js";
import productService from "../services/ProductService.js";
import emailService from "../services/EmailService.js";
import { uploadToImageKit, deleteFromImageKit } from "../config/imagekit.js";
import {
  successResponse,
  errorResponse,
  paginationResponse,
} from "../utils/responseFormatter.js";
import { logAdminActivity } from "../services/ActivityLogService.js";

// Create Product
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const files = req.files || [];

    // Upload images to ImageKit
    const uploadedImages = [];
    for (const file of files) {
      const result = await uploadToImageKit(
        file,
        "products",
        file.originalname,
      );
      uploadedImages.push({
        imageId: result.imageId,
        url: result.url,
      });
    }

    // Create product
    const product = await productService.createProduct(
      productData,
      uploadedImages,
    );

    // Send email notification to admin
    await emailService.sendProductNotificationToAdmin(product, "created");

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "CREATE",
      targetModel: "Product",
      targetId: product._id,
      changes: { name: product.name },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      { product },
      "Product created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update Product
export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;
    const files = req.files;

    let uploadedImages = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const result = await uploadToImageKit(
          file,
          "products",
          file.originalname,
        );
        uploadedImages.push({
          imageId: result.imageId,
          url: result.url,
        });
      }
    }

    const product = await productService.updateProduct(
      productId,
      updateData,
      uploadedImages,
    );

    // Send email notification
    await emailService.sendProductNotificationToAdmin(product, "updated");

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "UPDATE",
      targetModel: "Product",
      targetId: product._id,
      changes: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, { product }, "Product updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete Product (soft delete)
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    await productService.deleteProduct(productId);

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "DELETE",
      targetModel: "Product",
      targetId: productId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(res, null, "Product deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Single Product
export const getProduct = async (req, res) => {
  try {
    const { slugOrId } = req.params;

    let product;
    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(slugOrId)
        .populate("diseaseCategory", "name slug")
        .lean();
    } else {
      product = await Product.findOne({ slug: slugOrId })
        .populate("diseaseCategory", "name slug")
        .lean();
    }

    if (!product || product.isDeleted) {
      return errorResponse(res, "Product not found", 404);
    }

    // Get related products
    const relatedProducts = await productService.getRelatedProducts(
      product._id,
    );

    return successResponse(res, {
      product,
      relatedProducts,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get All Products with Filtering
export const getProducts = async (req, res) => {
  try {
    const result = await productService.getFilteredProducts(req.query);

    return paginationResponse(
      res,
      result.data,
      result.pagination.total,
      result.pagination.page,
      result.pagination.limit,
      "Products fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Toggle Product Status
export const toggleProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { isPublished } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    product.isPublished = isPublished;
    await product.save();

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "UPDATE",
      targetModel: "Product",
      targetId: product._id,
      changes: { isPublished },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      {
        product: {
          id: product._id,
          name: product.name,
          isPublished: product.isPublished,
        },
      },
      `Product ${isPublished ? "published" : "unpublished"} successfully`,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Bulk Delete Products
export const bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return errorResponse(res, "Product IDs array is required", 400);
    }

    // Delete images from ImageKit
    const products = await Product.find({ _id: { $in: productIds } });
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        await Promise.all(
          product.images.map((img) => deleteFromImageKit(img.imageId)),
        );
      }
    }

    // Soft delete products
    await Product.updateMany({ _id: { $in: productIds } }, { isDeleted: true });

    // Log activity
    await logAdminActivity({
      adminId: req.admin._id,
      actionType: "DELETE",
      targetModel: "Product",
      targetId: req.admin._id,
      changes: { bulkDeleted: productIds.length },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return successResponse(
      res,
      { deletedCount: productIds.length },
      "Products deleted successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
