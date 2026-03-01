import { body, param } from 'express-validator';
import { mongoIdValidator } from '../middlewares/validation.middleware.js';

export const addToCartValidator = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .custom(mongoIdValidator),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')
];

export const updateCartItemValidator = [
  param('itemId')
    .custom(mongoIdValidator),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')
];

export const mergeCartValidator = [
  body('guestItems')
    .isArray().withMessage('Guest items must be an array'),
  body('guestItems.*.productId')
    .custom(mongoIdValidator),
  body('guestItems.*.quantity')
    .isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')
];