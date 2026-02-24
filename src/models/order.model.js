import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { ORDER_STATUS } from "../constants/index.js";

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      default: () => uuidv4().split("-")[0].toUpperCase(),
      unique: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, required: true },
        priceAtPurchase: { type: Number, required: true },
      },
    ],
    totalAmount: Number,
    shippingCost: { type: Number, default: 60 },
    finalAmount: Number,
    deliveryAddress: String,
    phone: { type: String, required: true },
    paymentMethod: { type: String, default: "COD" },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    isConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    timelineLogs: [
      {
        status: String,
        date: { type: Date, default: Date.now },
        updatedBy: String, // Admin name or "System" or "User"
      },
    ],
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
