import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import mongoose from "mongoose";
import dayjs from "dayjs";

class AnalyticsService {
  async getDashboardStats() {
    try {
      const [
        totalOrders,
        totalRevenue,
        totalProducts,
        totalUsers,
        lowStockItems,
        recentOrders,
        topSellingProducts,
      ] = await Promise.all([
        Order.countDocuments(),
        Order.aggregate([
          { $match: { status: "Delivered" } },
          { $group: { _id: null, total: { $sum: "$finalAmount" } } },
        ]),
        Product.countDocuments({ isDeleted: false }),
        User.countDocuments({ isBlocked: false }),
        Product.countDocuments({
          $expr: { $lte: ["$stock", "$lowStockAlert"] },
          isDeleted: false,
        }),
        Order.find()
          .sort("-createdAt")
          .limit(5)
          .populate("user", "name email")
          .select("orderId finalAmount status createdAt"),
        Product.find({ isDeleted: false })
          .sort("-totalSold")
          .limit(5)
          .select("name slug totalSold price images"),
      ]);

      return {
        overview: {
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          totalProducts,
          totalUsers,
          lowStockItems,
        },
        recentOrders,
        topSellingProducts,
      };
    } catch (error) {
      throw new Error(`Dashboard stats failed: ${error.message}`);
    }
  }

  async getSalesReport(period = "daily", date = new Date()) {
    try {
      const startDate = this.getPeriodStartDate(period, date);
      const endDate = this.getPeriodEndDate(period, date);

      const matchStage = {
        status: "Delivered",
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      const salesData = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: this.getGroupByPeriod(period),
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$finalAmount" },
            averageOrderValue: { $avg: "$finalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const productSales = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.product",
            quantity: { $sum: "$products.quantity" },
            revenue: {
              $sum: {
                $multiply: ["$products.quantity", "$products.priceAtPurchase"],
              },
            },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
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
            "product.name": 1,
            "product.slug": 1,
            quantity: 1,
            revenue: 1,
          },
        },
      ]);

      return {
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        salesData,
        topProducts: productSales,
      };
    } catch (error) {
      throw new Error(`Sales report failed: ${error.message}`);
    }
  }

  async getProductPerformance(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      const orders = await Order.aggregate([
        { $match: { "products.product": mongoose.Types.ObjectId(productId) } },
        { $unwind: "$products" },
        { $match: { "products.product": mongoose.Types.ObjectId(productId) } },
        {
          $group: {
            _id: {
              month: { $month: "$createdAt" },
              year: { $year: "$createdAt" },
            },
            quantity: { $sum: "$products.quantity" },
            revenue: {
              $sum: {
                $multiply: ["$products.quantity", "$products.priceAtPurchase"],
              },
            },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]);

      const reviews = await Review.aggregate([
        {
          $match: {
            product: mongoose.Types.ObjectId(productId),
            isApproved: true,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rating",
            },
          },
        },
      ]);

      return {
        product: {
          name: product.name,
          slug: product.slug,
          stock: product.stock,
          totalSold: product.totalSold,
          price: product.price,
          ratingAverage: product.ratingAverage,
        },
        monthlyPerformance: orders,
        reviews: reviews[0] || {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: [],
        },
      };
    } catch (error) {
      throw new Error(`Product performance failed: ${error.message}`);
    }
  }

  getPeriodStartDate(period, date) {
    const d = dayjs(date);
    switch (period) {
      case "daily":
        return d.startOf("day").toDate();
      case "weekly":
        return d.startOf("week").toDate();
      case "monthly":
        return d.startOf("month").toDate();
      case "yearly":
        return d.startOf("year").toDate();
      default:
        return d.startOf("day").toDate();
    }
  }

  getPeriodEndDate(period, date) {
    const d = dayjs(date);
    switch (period) {
      case "daily":
        return d.endOf("day").toDate();
      case "weekly":
        return d.endOf("week").toDate();
      case "monthly":
        return d.endOf("month").toDate();
      case "yearly":
        return d.endOf("year").toDate();
      default:
        return d.endOf("day").toDate();
    }
  }

  getGroupByPeriod(period) {
    switch (period) {
      case "daily":
        return {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
      case "weekly":
        return {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        };
      case "monthly":
        return {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
      case "yearly":
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
  }
}

export default new AnalyticsService();
