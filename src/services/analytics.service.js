import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import dayjs from "dayjs";

export const getDashboardStats = async () => {
  const startOfMonth = dayjs().startOf("month").toDate();

  const salesStats = await Order.aggregate([
    { $match: { status: "Delivered" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$finalAmount" },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: "$finalAmount" },
      },
    },
  ]);

  const monthlySales = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfMonth }, status: "Delivered" } },
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        dailyRevenue: { $sum: "$finalAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const lowStockItems = await Product.find({ stock: { $lte: 5 } }).select(
    "name stock",
  );

  return {
    overview: salesStats[0] || { totalRevenue: 0, totalOrders: 0 },
    monthlySales,
    lowStockItems,
  };
};
