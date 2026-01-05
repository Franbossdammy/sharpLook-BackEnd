"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTrackingInfoValidation = exports.cancelOrderValidation = exports.confirmDeliveryValidation = exports.updateOrderStatusValidation = exports.getOrdersValidation = exports.calculateDeliveryFeeValidation = exports.orderIdValidation = exports.confirmPaymentValidation = exports.createOrderValidation = void 0;
const express_validator_1 = require("express-validator");
const Order_1 = require("../models/Order");
// import mongoose from 'mongoose';
/**
 * Create order validation
 */
exports.createOrderValidation = [
    (0, express_validator_1.body)('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),
    (0, express_validator_1.body)('items.*.product')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid product ID'),
    (0, express_validator_1.body)('items.*.quantity')
        .notEmpty()
        .withMessage('Quantity is required')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    (0, express_validator_1.body)('items.*.selectedVariant')
        .optional()
        .isObject()
        .withMessage('Selected variant must be an object'),
    (0, express_validator_1.body)('items.*.selectedVariant.name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Variant name is required'),
    (0, express_validator_1.body)('items.*.selectedVariant.option')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Variant option is required'),
    (0, express_validator_1.body)('deliveryType')
        .notEmpty()
        .withMessage('Delivery type is required')
        .isIn(Object.values(Order_1.DeliveryType))
        .withMessage('Invalid delivery type'),
    (0, express_validator_1.body)('deliveryAddress')
        .if((0, express_validator_1.body)('deliveryType').equals(Order_1.DeliveryType.HOME_DELIVERY))
        .notEmpty()
        .withMessage('Delivery address is required for home delivery'),
    (0, express_validator_1.body)('deliveryAddress.fullName')
        .if((0, express_validator_1.body)('deliveryType').equals(Order_1.DeliveryType.HOME_DELIVERY))
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('deliveryAddress.phone')
        .if((0, express_validator_1.body)('deliveryType').equals(Order_1.DeliveryType.HOME_DELIVERY))
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^(\+234|234|0)[7-9][0-1]\d{8}$/)
        .withMessage('Please provide a valid Nigerian phone number'),
    (0, express_validator_1.body)('deliveryAddress.address')
        .if((0, express_validator_1.body)('deliveryType').equals(Order_1.DeliveryType.HOME_DELIVERY))
        .trim()
        .notEmpty()
        .withMessage('Address is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Address must be between 10 and 500 characters'),
    (0, express_validator_1.body)('deliveryAddress.city')
        .if((0, express_validator_1.body)('deliveryType').equals(Order_1.DeliveryType.HOME_DELIVERY))
        .trim()
        .notEmpty()
        .withMessage('City is required'),
    (0, express_validator_1.body)('deliveryAddress.state')
        .if((0, express_validator_1.body)('deliveryType').equals(Order_1.DeliveryType.HOME_DELIVERY))
        .trim()
        .notEmpty()
        .withMessage('State is required'),
    (0, express_validator_1.body)('deliveryAddress.country')
        .if((0, express_validator_1.body)('deliveryType').equals(Order_1.DeliveryType.HOME_DELIVERY))
        .trim()
        .notEmpty()
        .withMessage('Country is required'),
    (0, express_validator_1.body)('paymentMethod')
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['card', 'bank_transfer', 'wallet', 'ussd'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.body)('customerNotes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Customer notes cannot exceed 1000 characters'),
];
/**
 * Confirm payment validation
 */
exports.confirmPaymentValidation = [
    (0, express_validator_1.param)('orderId').isMongoId().withMessage('Invalid order ID'),
    (0, express_validator_1.body)('paymentId')
        .notEmpty()
        .withMessage('Payment ID is required')
        .isMongoId()
        .withMessage('Invalid payment ID'),
];
/**
 * Order ID validation
 */
exports.orderIdValidation = [
    (0, express_validator_1.param)('orderId').isMongoId().withMessage('Invalid order ID'),
];
/**
 * Validation for calculating delivery fee preview
 */
exports.calculateDeliveryFeeValidation = [
    (0, express_validator_1.query)('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid product ID format'),
    (0, express_validator_1.query)('latitude')
        .notEmpty()
        .withMessage('Latitude is required')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.query)('longitude')
        .notEmpty()
        .withMessage('Longitude is required')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
];
/**
 * Get orders validation
 */
exports.getOrdersValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(Object.values(Order_1.OrderStatus))
        .withMessage('Invalid order status'),
    (0, express_validator_1.query)('seller')
        .optional()
        .isMongoId()
        .withMessage('Invalid seller ID'),
    (0, express_validator_1.query)('customer')
        .optional()
        .isMongoId()
        .withMessage('Invalid customer ID'),
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
];
/**
 * Update order status validation
 */
exports.updateOrderStatusValidation = [
    (0, express_validator_1.param)('orderId').isMongoId().withMessage('Invalid order ID'),
    (0, express_validator_1.body)('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(Object.values(Order_1.OrderStatus))
        .withMessage('Invalid order status'),
    (0, express_validator_1.body)('note')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Note cannot exceed 500 characters'),
];
/**
 * Confirm delivery validation
 */
exports.confirmDeliveryValidation = [
    (0, express_validator_1.param)('orderId').isMongoId().withMessage('Invalid order ID'),
    (0, express_validator_1.body)('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['customer', 'seller'])
        .withMessage('Role must be either customer or seller'),
];
/**
 * Cancel order validation
 */
exports.cancelOrderValidation = [
    (0, express_validator_1.param)('orderId').isMongoId().withMessage('Invalid order ID'),
    (0, express_validator_1.body)('reason')
        .trim()
        .notEmpty()
        .withMessage('Cancellation reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Cancellation reason must be between 10 and 500 characters'),
];
/**
 * Add tracking info validation
 */
exports.addTrackingInfoValidation = [
    (0, express_validator_1.param)('orderId').isMongoId().withMessage('Invalid order ID'),
    (0, express_validator_1.body)('trackingNumber')
        .trim()
        .notEmpty()
        .withMessage('Tracking number is required')
        .isLength({ min: 5, max: 100 })
        .withMessage('Tracking number must be between 5 and 100 characters'),
    (0, express_validator_1.body)('courierService')
        .trim()
        .notEmpty()
        .withMessage('Courier service is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Courier service must be between 2 and 100 characters'),
];
//# sourceMappingURL=order.validation.js.map