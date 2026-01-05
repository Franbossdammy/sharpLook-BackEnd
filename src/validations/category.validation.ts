import { body, param, query } from 'express-validator';

/**
 * Create category validation
 */
export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('icon').optional().trim().isURL().withMessage('Icon must be a valid URL'),

  body('image').optional().trim().isURL().withMessage('Image must be a valid URL'),

  body('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),

  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a positive integer'),
];

/**
 * Update category validation
 */
export const updateCategoryValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('icon').optional().trim().isURL().withMessage('Icon must be a valid URL'),

  body('image').optional().trim().isURL().withMessage('Image must be a valid URL'),

  body('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a positive integer'),
];

/**
 * Category ID param validation
 */
export const categoryIdValidation = [
  param('categoryId').isMongoId().withMessage('Invalid category ID'),
];

/**
 * Category slug param validation
 */
export const categorySlugValidation = [param('slug').trim().notEmpty().withMessage('Slug is required')];

/**
 * Get categories validation
 */
export const getCategoriesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),

  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  query('search').optional().trim().isLength({ min: 1 }),
];

/**
 * Reorder categories validation
 */
export const reorderCategoriesValidation = [
  body('orders')
    .isArray({ min: 1 })
    .withMessage('Orders must be a non-empty array'),

  body('orders.*.categoryId')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('orders.*.order')
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
];
