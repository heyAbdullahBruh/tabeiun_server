import { body, param } from "express-validator";
import { mongoIdValidator } from "../middlewares/validation.middleware.js";

export const createCategoryValidator = [
  body("name")
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters")
    .trim(),
  body("metaTitle")
    .optional()
    .isLength({ max: 60 })
    .withMessage("Meta title cannot exceed 60 characters"),
  body("metaDescription")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Meta description cannot exceed 160 characters"),
  body("keywords")
    .optional()
    .isArray()
    .withMessage("Keywords must be an array"),
];

export const updateCategoryValidator = [
  param("categoryId").custom(mongoIdValidator),
  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const categoryIdValidator = [
  param("categoryId").custom(mongoIdValidator),
];
