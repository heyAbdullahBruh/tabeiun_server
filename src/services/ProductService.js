import Product from "../models/Product.model.js";
import { BaseService } from "./BaseService.js";
import { QueryBuilder } from "../utils/queryBuilder.js";
import { generateUniqueSlug } from "../utils/slugGenerator.js";
import { deleteFromImageKit } from "../config/imagekit.js";
import Review from "../models/Review.model.js";

class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  async createProduct(productData, images = []) {
    try {
      // Generate unique slug
      const slug = await generateUniqueSlug(Product, productData.name);

      // Create product with images
      const product = await this.create({
        ...productData,
        slug,
        images,
      });

      return product;
    } catch (error) {
      throw new Error(`Product creation failed: ${error.message}`);
    }
  }

  async updateProduct(productId, updateData, newImages = []) {
    try {
      const product = await this.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // If name changed, update slug
      if (updateData.name && updateData.name !== product.name) {
        updateData.slug = await generateUniqueSlug(Product, updateData.name);
      }

      // Handle image updates
      if (newImages.length > 0) {
        // Delete old images from ImageKit
        if (product.images && product.images.length > 0) {
          await Promise.all(
            product.images.map((img) => deleteFromImageKit(img.imageId)),
          );
        }
        updateData.images = newImages;
      }

      const updatedProduct = await this.update(productId, updateData);
      return updatedProduct;
    } catch (error) {
      throw new Error(`Product update failed: ${error.message}`);
    }
  }

  async deleteProduct(productId) {
    try {
      const product = await this.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Delete images from ImageKit
      if (product.images && product.images.length > 0) {
        await Promise.all(
          product.images.map((img) => deleteFromImageKit(img.imageId)),
        );
      }

      // Soft delete the product
      await this.delete(productId, true);

      return true;
    } catch (error) {
      throw new Error(`Product deletion failed: ${error.message}`);
    }
  }

  async getFilteredProducts(queryString) {
    try {
      const queryBuilder = new QueryBuilder(Product.find(), queryString)
        .filter()
        .search()
        .filterByDisease()
        .filterByAgeGender()
        .filterByPrice()
        .filterByRating()
        .sort()
        .limitFields()
        .paginate();

      const products = await queryBuilder.query
        .populate("diseaseCategory", "name slug")
        .lean();

      const total = await queryBuilder.getTotalCount();
      const page = parseInt(queryString.page) || 1;
      const limit = parseInt(queryString.limit) || 10;

      return {
        data: products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Product filtering failed: ${error.message}`);
    }
  }

  async updateProductRating(productId) {
    try {
      const reviews = await Review.find({
        product: productId,
        isApproved: true,
      });

      const ratingCount = reviews.length;
      const ratingAverage =
        ratingCount > 0
          ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / ratingCount
          : 0;

      await this.update(productId, {
        ratingAverage: Math.round(ratingAverage * 10) / 10,
        ratingCount,
        totalReviews: ratingCount,
      });

      return { ratingAverage, ratingCount };
    } catch (error) {
      throw new Error(`Rating update failed: ${error.message}`);
    }
  }

  async getRelatedProducts(productId, limit = 4) {
    try {
      const product = await this.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      const relatedProducts = await Product.find({
        _id: { $ne: productId },
        diseaseCategory: product.diseaseCategory,
        isPublished: true,
        isDeleted: false,
      })
        .limit(limit)
        .populate("diseaseCategory", "name slug")
        .select(
          "name slug price discountPrice images shortDescription ratingAverage",
        )
        .lean();

      return relatedProducts;
    } catch (error) {
      throw new Error(`Related products fetch failed: ${error.message}`);
    }
  }
}

export default new ProductService();
