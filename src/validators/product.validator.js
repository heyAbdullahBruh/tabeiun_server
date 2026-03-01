import { body, param, query } from "express-validator";
import { mongoIdValidator } from "../middlewares/validation.middleware.js";

export const createProductValidator = [
  body("name")
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Name must be between 3 and 200 characters")
    .trim(),
  body("shortDescription")
    .notEmpty()
    .withMessage("Short description is required")
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters")
    .trim(),
  body("fullDescription")
    .notEmpty()
    .withMessage("Full description is required")
    .trim(),
  body("medicineBenefits")
    .optional()
    .isArray()
    .withMessage("Medicine benefits must be an array"),
  body("diseaseCategory")
    .notEmpty()
    .withMessage("Disease category is required")
    .custom(mongoIdValidator),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("discountPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount price must be a positive number")
    .custom((value, { req }) => {
      if (value && value >= req.body.price) {
        throw new Error("Discount price must be less than regular price");
      }
      return true;
    }),
];

export const updateProductValidator = [
  param("productId").custom(mongoIdValidator),
  body("name")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Name must be between 3 and 200 characters")
    .trim(),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
];

export const getProductsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Min price must be a positive number"),
  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Max price must be a positive number"),
  query("minRating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5"),
];

export const productIdValidator = [param("productId").custom(mongoIdValidator)];
