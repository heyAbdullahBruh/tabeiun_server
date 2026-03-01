import { body, param, query } from "express-validator";
import { mongoIdValidator } from "../middlewares/validation.middleware.js";
import { OrderStatus } from "../models/Order.model.js";

export const createOrderValidator = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one item is required"),
  body("items.*.productId").custom(mongoIdValidator),
  body("items.*.quantity")
    .isInt({ min: 1, max: 99 })
    .withMessage("Quantity must be between 1 and 99"),
  body("deliveryAddress")
    .notEmpty()
    .withMessage("Delivery address is required"),
  body("deliveryAddress.street")
    .notEmpty()
    .withMessage("Street address is required")
    .trim(),
  body("deliveryAddress.city")
    .notEmpty()
    .withMessage("City is required")
    .trim(),
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^01[3-9]\d{8}$/)
    .withMessage("Please provide a valid Bangladeshi phone number"),
];

export const orderStatusValidator = [
  param("orderId").custom(mongoIdValidator),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(Object.values(OrderStatus))
    .withMessage("Invalid order status"),
  body("note").optional().isString().trim(),
];

export const orderIdValidator = [param("orderId").custom(mongoIdValidator)];
