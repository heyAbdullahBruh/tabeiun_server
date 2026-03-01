
import { param } from 'express-validator';
import { mongoIdValidator } from '../middlewares/validation.middleware.js';

export const productIdValidator = [
  param('productId')
    .custom(mongoIdValidator)
];