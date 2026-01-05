import { body, param, query } from 'express-validator';
import { ProductCondition } from '../models/Product';
// import mongoose from 'mongoose';

/**
 * Create product validation
 */
export const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('subCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid subcategory ID'),

  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      return Array.isArray(value);
    })
    .withMessage('Tags must be an array'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('compareAtPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number'),

  body('costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),

  body('stock')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),

  body('sku')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters'),

  body('condition')
    .optional()
    .isIn(Object.values(ProductCondition))
    .withMessage('Invalid product condition'),

  body('brand')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brand must be between 1 and 100 characters'),

  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),

  body('deliveryOptions')
    .notEmpty()
    .withMessage('Delivery options are required')
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return parsed.homeDelivery !== undefined || parsed.pickup !== undefined;
        } catch {
          return false;
        }
      }
      return value.homeDelivery !== undefined || value.pickup !== undefined;
    })
    .withMessage('At least one delivery option (homeDelivery or pickup) is required'),
];

/**
 * Update product validation
 */
export const updateProductValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('subCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid subcategory ID'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('compareAtPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number'),

  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('condition')
    .optional()
    .isIn(Object.values(ProductCondition))
    .withMessage('Invalid product condition'),

  body('brand')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brand must be between 1 and 100 characters'),
];

/**
 * Product ID validation
 */
export const productIdValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),
];

/**
 * Get products validation
 */
export const getProductsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  query('subCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid subcategory ID'),

  query('seller')
    .optional()
    .isMongoId()
    .withMessage('Invalid seller ID'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  query('condition')
    .optional()
    .isIn(Object.values(ProductCondition))
    .withMessage('Invalid product condition'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price', 'rating', 'orders', 'views'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

/**
 * Approve/Reject product validation
 */
export const approveProductValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),
];

export const rejectProductValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];

/**
 * Feature product validation
 */
export const featureProductValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),

  body('featuredUntil')
    .notEmpty()
    .withMessage('Featured until date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      return date > now;
    })
    .withMessage('Featured until date must be in the future'),
];

/**
 * Sponsor product validation
 */
export const sponsorProductValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),

  body('sponsoredUntil')
    .notEmpty()
    .withMessage('Sponsored until date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      return date > now;
    })
    .withMessage('Sponsored until date must be in the future'),

  body('amount')
    .notEmpty()
    .withMessage('Sponsorship amount is required')
    .isFloat({ min: 0 })
    .withMessage('Sponsorship amount must be a positive number'),
];

/**
 * Update stock validation
 */
export const updateStockValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
];