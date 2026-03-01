import analyticsService from "../services/AnalyticsService.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

// Get Dashboard Overview
export const getDashboardOverview = async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    return successResponse(res, stats, "Dashboard stats fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Sales Report
export const getSalesReport = async (req, res) => {
  try {
    const { period = "daily", date } = req.query;
    const report = await analyticsService.getSalesReport(
      period,
      date ? new Date(date) : new Date(),
    );
    return successResponse(res, report, "Sales report fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Product Performance
export const getProductPerformance = async (req, res) => {
  try {
    const { productId } = req.params;
    const performance = await analyticsService.getProductPerformance(productId);
    return successResponse(
      res,
      performance,
      "Product performance fetched successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Revenue Analytics
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const revenue = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          createdAt: {
            $gte: new Date(targetYear, 0, 1),
            $lte: new Date(targetYear, 11, 31),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalRevenue: { $sum: "$finalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing months with zero
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthData = revenue.find((r) => r._id === i + 1);
      return {
        month: i + 1,
        totalRevenue: monthData?.totalRevenue || 0,
        orderCount: monthData?.orderCount || 0,
      };
    });

    return successResponse(res, {
      year: targetYear,
      monthlyData,
      totalRevenue: monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0),
      totalOrders: monthlyData.reduce((sum, m) => sum + m.orderCount, 0),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Top Selling Products
export const getTopSellingProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Product.find({ isDeleted: false })
      .sort("-totalSold")
      .limit(parseInt(limit))
      .select("name slug totalSold price images ratingAverage")
      .lean();

    return successResponse(res, { topProducts });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get Category Performance
export const getCategoryPerformance = async (req, res) => {
  try {
    const categoryStats = await Order.aggregate([
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
    ]);

    return successResponse(res, { categories: categoryStats });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get User Analytics
export const getUserAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isBlocked: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });

    const usersByMonth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    return successResponse(res, {
      totalUsers,
      blockedUsers,
      newUsersToday,
      activeUsers: totalUsers - blockedUsers,
      usersByMonth,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
