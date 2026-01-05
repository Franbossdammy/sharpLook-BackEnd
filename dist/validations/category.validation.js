"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderCategoriesValidation = exports.getCategoriesValidation = exports.categorySlugValidation = exports.categoryIdValidation = exports.updateCategoryValidation = exports.createCategoryValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Create category validation
 */
exports.createCategoryValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('icon').optional().trim().isURL().withMessage('Icon must be a valid URL'),
    (0, express_validator_1.body)('image').optional().trim().isURL().withMessage('Image must be a valid URL'),
    (0, express_validator_1.body)('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),
    (0, express_validator_1.body)('order').optional().isInt({ min: 0 }).withMessage('Order must be a positive integer'),
];
/**
 * Update category validation
 */
exports.updateCategoryValidation = [
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('icon').optional().trim().isURL().withMessage('Icon must be a valid URL'),
    (0, express_validator_1.body)('image').optional().trim().isURL().withMessage('Image must be a valid URL'),
    (0, express_validator_1.body)('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    (0, express_validator_1.body)('order').optional().isInt({ min: 0 }).withMessage('Order must be a positive integer'),
];
/**
 * Category ID param validation
 */
exports.categoryIdValidation = [
    (0, express_validator_1.param)('categoryId').isMongoId().withMessage('Invalid category ID'),
];
/**
 * Category slug param validation
 */
exports.categorySlugValidation = [(0, express_validator_1.param)('slug').trim().notEmpty().withMessage('Slug is required')];
/**
 * Get categories validation
 */
exports.getCategoriesValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),
    (0, express_validator_1.query)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    (0, express_validator_1.query)('search').optional().trim().isLength({ min: 1 }),
];
/**
 * Reorder categories validation
 */
exports.reorderCategoriesValidation = [
    (0, express_validator_1.body)('orders')
        .isArray({ min: 1 })
        .withMessage('Orders must be a non-empty array'),
    (0, express_validator_1.body)('orders.*.categoryId')
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.body)('orders.*.order')
        .isInt({ min: 0 })
        .withMessage('Order must be a positive integer'),
];
//# sourceMappingURL=category.validation.js.map