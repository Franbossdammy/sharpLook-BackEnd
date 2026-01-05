"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStockValidation = exports.sponsorProductValidation = exports.featureProductValidation = exports.rejectProductValidation = exports.approveProductValidation = exports.getProductsValidation = exports.productIdValidation = exports.updateProductValidation = exports.createProductValidation = void 0;
const express_validator_1 = require("express-validator");
const Product_1 = require("../models/Product");
// import mongoose from 'mongoose';
/**
 * Create product validation
 */
exports.createProductValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ min: 3, max: 200 })
        .withMessage('Product name must be between 3 and 200 characters'),
    (0, express_validator_1.body)('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 10, max: 5000 })
        .withMessage('Description must be between 10 and 5000 characters'),
    (0, express_validator_1.body)('shortDescription')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Short description cannot exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .notEmpty()
        .withMessage('Category is required')
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.body)('subCategory')
        .optional()
        .isMongoId()
        .withMessage('Invalid subcategory ID'),
    (0, express_validator_1.body)('tags')
        .optional()
        .custom((value) => {
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed);
            }
            catch {
                return false;
            }
        }
        return Array.isArray(value);
    })
        .withMessage('Tags must be an array'),
    (0, express_validator_1.body)('price')
        .notEmpty()
        .withMessage('Price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('compareAtPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Compare price must be a positive number'),
    (0, express_validator_1.body)('costPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Cost price must be a positive number'),
    (0, express_validator_1.body)('stock')
        .notEmpty()
        .withMessage('Stock quantity is required')
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    (0, express_validator_1.body)('lowStockThreshold')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Low stock threshold must be a non-negative integer'),
    (0, express_validator_1.body)('sku')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('SKU must be between 1 and 50 characters'),
    (0, express_validator_1.body)('condition')
        .optional()
        .isIn(Object.values(Product_1.ProductCondition))
        .withMessage('Invalid product condition'),
    (0, express_validator_1.body)('brand')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Brand must be between 1 and 100 characters'),
    (0, express_validator_1.body)('weight')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Weight must be a positive number'),
    (0, express_validator_1.body)('deliveryOptions')
        .notEmpty()
        .withMessage('Delivery options are required')
        .custom((value) => {
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return parsed.homeDelivery !== undefined || parsed.pickup !== undefined;
            }
            catch {
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
exports.updateProductValidation = [
    (0, express_validator_1.param)('productId').isMongoId().withMessage('Invalid product ID'),
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Product name must be between 3 and 200 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('Description must be between 10 and 5000 characters'),
    (0, express_validator_1.body)('shortDescription')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Short description cannot exceed 500 characters'),
    (0, express_validator_1.body)('category')
        .optional()
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.body)('subCategory')
        .optional()
        .isMongoId()
        .withMessage('Invalid subcategory ID'),
    (0, express_validator_1.body)('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('compareAtPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Compare price must be a positive number'),
    (0, express_validator_1.body)('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    (0, express_validator_1.body)('condition')
        .optional()
        .isIn(Object.values(Product_1.ProductCondition))
        .withMessage('Invalid product condition'),
    (0, express_validator_1.body)('brand')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Brand must be between 1 and 100 characters'),
];
/**
 * Product ID validation
 */
exports.productIdValidation = [
    (0, express_validator_1.param)('productId').isMongoId().withMessage('Invalid product ID'),
];
/**
 * Get products validation
 */
exports.getProductsValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('category')
        .optional()
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.query)('subCategory')
        .optional()
        .isMongoId()
        .withMessage('Invalid subcategory ID'),
    (0, express_validator_1.query)('seller')
        .optional()
        .isMongoId()
        .withMessage('Invalid seller ID'),
    (0, express_validator_1.query)('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be a positive number'),
    (0, express_validator_1.query)('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be a positive number'),
    (0, express_validator_1.query)('condition')
        .optional()
        .isIn(Object.values(Product_1.ProductCondition))
        .withMessage('Invalid product condition'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['createdAt', 'price', 'rating', 'orders', 'views'])
        .withMessage('Invalid sort field'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
];
/**
 * Approve/Reject product validation
 */
exports.approveProductValidation = [
    (0, express_validator_1.param)('productId').isMongoId().withMessage('Invalid product ID'),
];
exports.rejectProductValidation = [
    (0, express_validator_1.param)('productId').isMongoId().withMessage('Invalid product ID'),
    (0, express_validator_1.body)('reason')
        .trim()
        .notEmpty()
        .withMessage('Rejection reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Rejection reason must be between 10 and 500 characters'),
];
/**
 * Feature product validation
 */
exports.featureProductValidation = [
    (0, express_validator_1.param)('productId').isMongoId().withMessage('Invalid product ID'),
    (0, express_validator_1.body)('featuredUntil')
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
exports.sponsorProductValidation = [
    (0, express_validator_1.param)('productId').isMongoId().withMessage('Invalid product ID'),
    (0, express_validator_1.body)('sponsoredUntil')
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
    (0, express_validator_1.body)('amount')
        .notEmpty()
        .withMessage('Sponsorship amount is required')
        .isFloat({ min: 0 })
        .withMessage('Sponsorship amount must be a positive number'),
];
/**
 * Update stock validation
 */
exports.updateStockValidation = [
    (0, express_validator_1.param)('productId').isMongoId().withMessage('Invalid product ID'),
    (0, express_validator_1.body)('quantity')
        .notEmpty()
        .withMessage('Quantity is required')
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),
];
//# sourceMappingURL=product.validation.js.map