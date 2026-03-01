import { body, param } from 'express-validator';
import { mongoIdValidator } from '../middlewares/validation.middleware.js';

export const updateProfileValidator = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .trim(),
  body('phone')
    .optional()
    .matches(/^01[3-9]\d{8}$/).withMessage('Please provide a valid Bangladeshi phone number'),
  body('address.street')
    .optional()
    .isString().withMessage('Street must be a string')
    .trim(),
  body('address.city')
    .optional()
    .isString().withMessage('City must be a string')
    .trim(),
  body('address.postalCode')
    .optional()
    .isString().withMessage('Postal code must be a string')
    .trim()
];

export const addressValidator = [
  body('address')
    .notEmpty().withMessage('Address is required'),
  body('address.street')
    .notEmpty().withMessage('Street address is required')
    .trim(),
  body('address.city')
    .notEmpty().withMessage('City is required')
    .trim(),
  body('address.postalCode')
    .optional()
    .trim()
];

export const userIdValidator = [
  param('userId')
    .custom(mongoIdValidator)
];