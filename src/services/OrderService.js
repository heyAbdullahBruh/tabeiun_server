import Order, { OrderStatus } from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import { BaseService } from "./BaseService.js";
import { generateOrderId } from "../utils/orderIdGenerator.js";
import mongoose from "mongoose";

class OrderService extends BaseService {
  constructor() {
    super(Order);
  }

  async createOrder(userId, orderData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { items, deliveryAddress, phone } = orderData;

      // Validate stock and calculate totals
      let totalAmount = 0;
      const orderProducts = [];

      for (const item of items) {
        const product = await Product.findById(item.productId).session(session);

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const price = product.discountPrice || product.price;
        totalAmount += price * item.quantity;

        orderProducts.push({
          product: product._id,
          quantity: item.quantity,
          priceAtPurchase: price,
        });
      }

      // Create order
      const order = await Order.create(
        [
          {
            orderId: generateOrderId(),
            user: userId,
            products: orderProducts,
            totalAmount,
            discount: 0,
            shippingCost: 0,
            finalAmount: totalAmount,
            deliveryAddress,
            phone,
            status: OrderStatus.PENDING,
          },
        ],
        { session },
      );

      // Commit transaction
      await session.commitTransaction();

      return order[0];
    } catch (error) {
      await session.abortTransaction();
      throw new Error(`Order creation failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async confirmOrder(orderId, adminId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new Error("Order cannot be confirmed");
      }

      // Update stock for each product
      for (const item of order.products) {
        const product = await Product.findById(item.product).session(session);

        if (!product) {
          throw new Error(`Product ${item.product} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product`);
        }

        product.stock -= item.quantity;
        product.totalSold += item.quantity;
        await product.save({ session });
      }

      // Update order status
      order.status = OrderStatus.CONFIRMED;
      order.isConfirmedBy = adminId;
      order.timelineLogs.push({
        status: OrderStatus.CONFIRMED,
        date: new Date(),
        updatedBy: adminId,
      });

      await order.save({ session });

      await session.commitTransaction();
      return order;
    } catch (error) {
      await session.abortTransaction();
      throw new Error(`Order confirmation failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async updateOrderStatus(orderId, status, adminId, note = "") {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      // Validate status transition
      this.validateStatusTransition(order.status, status);

      order.status = status;
      order.timelineLogs.push({
        status,
        date: new Date(),
        updatedBy: adminId,
        note,
      });

      if (status === OrderStatus.DELIVERED) {
        order.deliveredAt = new Date();
      }

      if (status === OrderStatus.CANCELLED) {
        // If cancelling confirmed order, restore stock
        if (order.status === OrderStatus.CONFIRMED) {
          await this.restoreStock(order);
        }
      }

      await order.save();
      return order;
    } catch (error) {
      throw new Error(`Order status update failed: ${error.message}`);
    }
  }

  async cancelOrder(orderId, userId, reason = "") {
    try {
      const order = await Order.findOne({ _id: orderId, user: userId });

      if (!order) {
        throw new Error("Order not found");
      }

      // User can only cancel pending orders
      if (order.status !== OrderStatus.PENDING) {
        throw new Error("Order cannot be cancelled");
      }

      order.status = OrderStatus.CANCELLED;
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
      order.timelineLogs.push({
        status: OrderStatus.CANCELLED,
        date: new Date(),
        note: reason,
      });

      await order.save();
      return order;
    } catch (error) {
      throw new Error(`Order cancellation failed: ${error.message}`);
    }
  }

  async getUserOrders(userId, query = {}) {
    try {
      const { page = 1, limit = 10, status } = query;

      const filter = { user: userId };
      if (status) {
        filter.status = status;
      }

      const orders = await Order.find(filter)
        .populate("products.product", "name slug images price")
        .sort("-createdAt")
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Order.countDocuments(filter);

      return {
        data: orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      throw new Error(`User orders fetch failed: ${error.message}`);
    }
  }

  calculateWorkingDaysDelivery = (startDate, workingDays) => {
    const deliveryDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < workingDays) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      const dayOfWeek = deliveryDate.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return deliveryDate;
  };

  trackOrder = async (orderId, userId) => {
    try {
      const order = await Order.findOne({
        orderId: orderId,
        user: userId,
      })
        .populate("products.product", "name slug images price")
        .populate("user", "name email phone")
        .lean();

      if (!order) {
        throw new Error("Order not found");
      }

      // Calculate estimated delivery date based on order status
      let estimatedDelivery = null;
      let deliveryMessage = "";

      const createdAt = new Date(order.createdAt);

      switch (order.status) {
        case "Pending":
          // Will be confirmed within 24 hours, then 2-3 working days delivery
          const confirmDate = new Date(createdAt);
          confirmDate.setDate(confirmDate.getDate() + 1);
          estimatedDelivery = this.calculateWorkingDaysDelivery(confirmDate, 3);
          deliveryMessage =
            "Order will be confirmed within 24 hours. Delivery within 2-3 working days after confirmation.";
          break;

        case "Confirmed":
          // 2-3 working days from confirmation
          estimatedDelivery = this.calculateWorkingDaysDelivery(createdAt, 3);
          deliveryMessage =
            "Your order is confirmed. Expected delivery within 2-3 working days.";
          break;

        case "Processing":
          // 2 working days from processing
          estimatedDelivery = this.calculateWorkingDaysDelivery(createdAt, 2);
          deliveryMessage =
            "Your order is being processed. Expected delivery within 2 working days.";
          break;

        case "Shipped":
          // 1-2 working days from shipping
          estimatedDelivery = this.calculateWorkingDaysDelivery(createdAt, 2);
          deliveryMessage =
            "Your order has been shipped. Expected delivery within 1-2 working days.";
          break;

        case "Delivered":
          estimatedDelivery = createdAt;
          deliveryMessage =
            "Your order has been delivered. Thank you for shopping with us!";
          break;

        case "Cancelled":
          deliveryMessage = "This order has been cancelled.";
          break;

        default:
          estimatedDelivery = this.calculateWorkingDaysDelivery(createdAt, 5);
          deliveryMessage =
            "Delivery within 2-3 working days after order confirmation.";
      }

      // Format date for better display
      const formatDate = (date) => {
        if (!date) return null;
        return {
          date: date,
          formatted: date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          dayName: date.toLocaleDateString("en-GB", { weekday: "long" }),
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        };
      };

      // Get timeline for frontend display
      const timeline = order.timelineLogs.map((log) => ({
        status: log.status,
        date: log.date,
        completed: true,
        note: log.note,
      }));

      // Add estimated delivery to timeline if not delivered
      if (
        order.status !== "Delivered" &&
        order.status !== "Cancelled" &&
        estimatedDelivery
      ) {
        timeline.push({
          status: "Estimated Delivery",
          date: estimatedDelivery,
          completed: false,
          note: deliveryMessage,
        });
      }

      // Calculate remaining days
      let remainingDays = null;
      if (
        estimatedDelivery &&
        estimatedDelivery > new Date() &&
        order.status !== "Delivered"
      ) {
        const timeDiff = estimatedDelivery.getTime() - new Date().getTime();
        remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }

      return {
        order: {
          ...order,
          estimatedDeliveryInfo: estimatedDelivery
            ? formatDate(estimatedDelivery)
            : null,
          deliveryMessage,
          remainingDays: remainingDays > 0 ? remainingDays : null,
        },
        estimatedDelivery:
          estimatedDelivery && estimatedDelivery > new Date()
            ? estimatedDelivery
            : null,
        timeline,
        currentStatus: order.status,
        statusHistory: order.timelineLogs,
        trackingInfo: {
          status: order.status,
          lastUpdate:
            order.timelineLogs[order.timelineLogs.length - 1]?.date ||
            order.createdAt,
          estimatedDelivery: estimatedDelivery
            ? formatDate(estimatedDelivery)
            : null,
          remainingDays,
        },
      };
    } catch (error) {
      throw new Error(`Failed to track order: ${error.message}`);
    }
  };

  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  async restoreStock(order) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of order.products) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: item.quantity,
              totalSold: -item.quantity,
            },
          },
          { session },
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new OrderService();
