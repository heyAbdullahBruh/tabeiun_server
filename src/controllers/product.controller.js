import { Product } from "../models/product.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadToImageKit ,deleteFromImageKit } from "../utils/imageUpload.js";

export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const files = req.files; // From Multer

    // Handle Image Uploads
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        uploadToImageKit(
          file.buffer,
          `prod_${Date.now()}_${file.originalname}`,
        ),
      );
      productData.images = await Promise.all(uploadPromises);
    }

    const product = await Product.create(productData);
    return res
      .status(201)
      .json(new ApiResponse(201, product, "Product added successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, null, error.message));
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteImageIds, ...updateData } = req.body; // deleteImageIds is an array of ImageKit IDs to remove
    const files = req.files;

    let product = await Product.findById(id);
    if (!product)
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Product not found"));

    // 1. Handle Image Deletions (if any)
    if (deleteImageIds && deleteImageIds.length > 0) {
      const idsToDelete = Array.isArray(deleteImageIds)
        ? deleteImageIds
        : [deleteImageIds];
      for (const imgId of idsToDelete) {
        await deleteFromImageKit(imgId);
        product.images = product.images.filter((img) => img.imageId !== imgId);
      }
    }

    // 2. Handle New Image Uploads
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        uploadToImageKit(
          file.buffer,
          `prod_upd_${Date.now()}_${file.originalname}`,
        ),
      );
      const newImages = await Promise.all(uploadPromises);
      product.images.push(...newImages);
    }

    // 3. Update Text Fields
    Object.assign(product, updateData);

    await product.save();
    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product updated successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, null, error.message));
  }
};

export const getPublicProducts = async (req, res) => {
  const results = await filterProductsService(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, results, "Products Fetched"));
};

export const getProductBySlug = async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate(
    "diseaseCategory",
  );
  if (!product)
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product Detail Fetched"));
};

export const softDeleteProduct = async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
  return res.status(200).json(new ApiResponse(200, null, "Product deleted"));
};
