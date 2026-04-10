import Product from "../models/Product.model.js";
import { BaseService } from "./BaseService.js";
import { QueryBuilder } from "../utils/queryBuilder.js";
import { generateUniqueSlug } from "../utils/slugGenerator.js";
import { deleteFromImageKit } from "../config/imagekit.js";
import Review from "../models/Review.model.js";
import Category from "../models/Category.model.js";

class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  async createProduct(productData, images = []) {
    try {
      const slug = await generateUniqueSlug(Product, productData.name);
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

      if (updateData.name && updateData.name !== product.name) {
        updateData.slug = await generateUniqueSlug(Product, updateData.name);
      }

      if (newImages.length > 0) {
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

      if (product.images && product.images.length > 0) {
        await Promise.all(
          product.images.map((img) => deleteFromImageKit(img.imageId)),
        );
      }

      await this.delete(productId, true);
      return true;
    } catch (error) {
      throw new Error(`Product deletion failed: ${error.message}`);
    }
  }

  async getFilteredProducts(queryString) {
    try {
      // Transform frontend filters to backend expected format
      const transformedQuery = this.transformFrontendFilters(queryString);

      const queryBuilder = new QueryBuilder(Product.find(), transformedQuery)
        .filter()
        .search()
        .filterByDisease()
        .filterByAgeGender()
        .filterByPrice()
        .filterByRating()
        .filterByStockStatus()
        .filterByPublishStatus()
        .filterByCategory()
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

  // Transform frontend filters to match QueryBuilder expectations
  transformFrontendFilters(filters) {
    const transformed = { ...filters };

    // Map frontend parameter names to backend parameter names
    if (filters.category) {
      transformed.diseaseCategory = filters.category;
      delete transformed.category;
    }

    // Handle stock status filter
    if (filters.stockStatus) {
      transformed.stockStatus = filters.stockStatus;
      delete transformed.stockStatus;
    }

    // Handle publish status
    if (filters.isPublished !== undefined && filters.isPublished !== "") {
      transformed.isPublished = filters.isPublished === "true";
    }

    // Handle price range
    if (filters.minPrice) {
      transformed.minPrice = filters.minPrice;
    }
    if (filters.maxPrice) {
      transformed.maxPrice = filters.maxPrice;
    }

    return transformed;
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

  async searchProducts(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, category, minPrice, maxPrice } = options;

      const filter = {
        isPublished: true,
        isDeleted: false,
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { shortDescription: { $regex: searchTerm, $options: "i" } },
          { fullDescription: { $regex: searchTerm, $options: "i" } },
          { medicineBenefits: { $in: [new RegExp(searchTerm, "i")] } },
          { diseaseTags: { $in: [new RegExp(searchTerm, "i")] } },
          { ingredients: { $in: [new RegExp(searchTerm, "i")] } },
        ],
      };

      if (category) filter.diseaseCategory = category;
      if (minPrice || maxPrice) {
        filter.$expr = {
          $cond: {
            if: {
              $and: [
                { $ne: ["$discountPrice", null] },
                { $lt: ["$discountPrice", "$price"] },
              ],
            },
            then: {
              $and: [
                { $gte: ["$discountPrice", minPrice || 0] },
                { $lte: ["$discountPrice", maxPrice || Infinity] },
              ],
            },
            else: {
              $and: [
                { $gte: ["$price", minPrice || 0] },
                { $lte: ["$price", maxPrice || Infinity] },
              ],
            },
          },
        };
      }

      const products = await Product.find(filter)
        .populate("diseaseCategory", "name slug")
        .sort("-createdAt")
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Product.countDocuments(filter);

      return {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      throw new Error(`Product search failed: ${error.message}`);
    }
  }

  async getFeaturedProducts(limit = 10) {
    try {
      const products = await Product.find({
        isFeatured: true,
        isPublished: true,
        isDeleted: false,
      })
        .populate("diseaseCategory", "name slug")
        .sort("-createdAt")
        .limit(parseInt(limit))
        .lean();

      return products;
    } catch (error) {
      throw new Error(`Failed to fetch featured products: ${error.message}`);
    }
  }

  getTopSellingProducts = async (limit = 10) => {
    try {
      const products = await Product.find({
        isPublished: true,
        isDeleted: false,
      })
        .populate("diseaseCategory", "name slug")
        .sort("-totalSold")
        .limit(parseInt(limit))
        .lean();

      return products;
    } catch (error) {
      throw new Error(`Failed to fetch top selling products: ${error.message}`);
    }
  };

  getRecommendedProducts = async (userId, limit = 10) => {
    try {
      // Get user's order history
      const userOrders = await Order.find({ user: userId, status: "Delivered" })
        .populate("products.product")
        .limit(5);

      // Extract categories and tags from user's purchase history
      const purchasedCategories = new Set();
      const purchasedTags = new Set();

      userOrders.forEach((order) => {
        order.products.forEach((item) => {
          if (item.product) {
            if (item.product.diseaseCategory) {
              purchasedCategories.add(item.product.diseaseCategory.toString());
            }
            item.product.diseaseTags?.forEach((tag) => purchasedTags.add(tag));
          }
        });
      });

      // Build recommendation query
      const filter = {
        isPublished: true,
        isDeleted: false,
        _id: { $nin: await getPurchasedProductIds(userId) }, // Exclude purchased products
      };

      if (purchasedCategories.size > 0) {
        filter.diseaseCategory = { $in: Array.from(purchasedCategories) };
      }

      if (purchasedTags.size > 0) {
        filter.diseaseTags = { $in: Array.from(purchasedTags) };
      }

      const products = await Product.find(filter)
        .populate("diseaseCategory", "name slug")
        .sort("-ratingAverage", "-totalSold")
        .limit(parseInt(limit))
        .lean();

      // If not enough recommendations, get top rated products
      if (products.length < parseInt(limit)) {
        const fallbackProducts = await Product.find({
          isPublished: true,
          isDeleted: false,
          _id: { $nin: await getPurchasedProductIds(userId) },
        })
          .sort("-ratingAverage", "-totalSold")
          .limit(parseInt(limit) - products.length)
          .lean();

        products.push(...fallbackProducts);
      }

      return products;
    } catch (error) {
      throw new Error(`Failed to fetch recommended products: ${error.message}`);
    }
  };

  // Helper function
  getPurchasedProductIds = async (userId) => {
    const orders = await Order.find({ user: userId, status: "Delivered" });
    const productIds = [];
    orders.forEach((order) => {
      order.products.forEach((item) => {
        productIds.push(item.product);
      });
    });
    return productIds;
  };

  getProductsByCategorySlug = async (categorySlug, options = {}) => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "-createdAt",
        minPrice,
        maxPrice,
      } = options;

      // Find category by slug
      const category = await Category.findOne({
        slug: categorySlug,
        isActive: true,
      });
      if (!category) {
        throw new Error("Category not found");
      }

      const filter = {
        diseaseCategory: category._id,
        isPublished: true,
        isDeleted: false,
      };

      if (minPrice || maxPrice) {
        filter.$expr = {
          $cond: {
            if: {
              $and: [
                { $ne: ["$discountPrice", null] },
                { $lt: ["$discountPrice", "$price"] },
              ],
            },
            then: {
              $and: [
                { $gte: ["$discountPrice", minPrice || 0] },
                { $lte: ["$discountPrice", maxPrice || Infinity] },
              ],
            },
            else: {
              $and: [
                { $gte: ["$price", minPrice || 0] },
                { $lte: ["$price", maxPrice || Infinity] },
              ],
            },
          },
        };
      }

      const products = await Product.find(filter)
        .populate("diseaseCategory", "name slug")
        .sort(sortBy)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Product.countDocuments(filter);

      return {
        category,
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch products by category: ${error.message}`);
    }
  };
}

export default new ProductService();
