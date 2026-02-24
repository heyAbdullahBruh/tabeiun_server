import { Order } from "../models/order.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  validateAndReduceStock,
  restoreStock,
} from "../services/order.service.js";
import { ORDER_STATUS } from "../constants/index.js";

// PUBLIC: Place Order
export const placeOrder = async (req, res) => {
  const { products, deliveryAddress, phone, shippingCost } = req.body;

  const totalAmount = products.reduce(
    (acc, item) => acc + item.priceAtPurchase * item.quantity,
    0,
  );
  const finalAmount = totalAmount + (shippingCost || 60);

  const order = await Order.create({
    user: req.user._id,
    products,
    totalAmount,
    shippingCost,
    finalAmount,
    deliveryAddress,
    phone,
    timelineLogs: [{ status: ORDER_STATUS.PENDING, updatedBy: "Customer" }],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order placed. Pending confirmation."));
};

// ADMIN: Update Status (The Business Rule Engine)
export const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body; // e.g., "Confirmed", "Cancelled"

  const order = await Order.findById(orderId);
  if (!order)
    return res.status(404).json(new ApiResponse(404, null, "Order not found"));

  // Logic: When status moves from Pending -> Confirmed, REDUCE STOCK
  if (
    status === ORDER_STATUS.CONFIRMED &&
    order.status === ORDER_STATUS.PENDING
  ) {
    try {
      await validateAndReduceStock(order.products);
      order.isConfirmedBy = req.admin._id;
    } catch (error) {
      return res.status(400).json(new ApiResponse(400, null, error.message));
    }
  }

  // Logic: If order is Cancelled after being Confirmed, RESTORE STOCK
  if (
    status === ORDER_STATUS.CANCELLED &&
    order.status !== ORDER_STATUS.PENDING &&
    order.status !== ORDER_STATUS.CANCELLED
  ) {
    await restoreStock(order.products);
  }

  order.status = status;
  order.timelineLogs.push({ status, updatedBy: req.admin.name });
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, `Order marked as ${status}`));
};
