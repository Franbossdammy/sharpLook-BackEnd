import { body, param, query } from 'express-validator';
import { OrderStatus, DeliveryType } from '../models/Order';
// import mongoose from 'mongoose';

/**
 * Create order validation
 */
export const createOrderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),

  body('items.*.product')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('items.*.selectedVariant')
    .optional()
    .isObject()
    .withMessage('Selected variant must be an object'),

  body('items.*.selectedVariant.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Variant name is required'),

  body('items.*.selectedVariant.option')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Variant option is required'),

  body('deliveryType')
    .notEmpty()
    .withMessage('Delivery type is required')
    .isIn(Object.values(DeliveryType))
    .withMessage('Invalid delivery type'),

  body('deliveryAddress')
    .if(body('deliveryType').equals(DeliveryType.HOME_DELIVERY))
    .notEmpty()
    .withMessage('Delivery address is required for home delivery'),

  body('deliveryAddress.fullName')
    .if(body('deliveryType').equals(DeliveryType.HOME_DELIVERY))
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('deliveryAddress.phone')
    .if(body('deliveryType').equals(DeliveryType.HOME_DELIVERY))
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+234|234|0)[7-9][0-1]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),

  body('deliveryAddress.address')
    .if(body('deliveryType').equals(DeliveryType.HOME_DELIVERY))
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),

  body('deliveryAddress.city')
    .if(body('deliveryType').equals(DeliveryType.HOME_DELIVERY))
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('deliveryAddress.state')
    .if(body('deliveryType').equals(DeliveryType.HOME_DELIVERY))
    .trim()
    .notEmpty()
    .withMessage('State is required'),

  body('deliveryAddress.country')
    .if(body('deliveryType').equals(DeliveryType.HOME_DELIVERY))
    .trim()
    .notEmpty()
    .withMessage('Country is required'),

  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['card', 'bank_transfer', 'wallet', 'ussd'])
    .withMessage('Invalid payment method'),

  body('customerNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Customer notes cannot exceed 1000 characters'),
];

/**
 * Confirm payment validation
 */
export const confirmPaymentValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),

  body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isMongoId()
    .withMessage('Invalid payment ID'),
];

/**
 * Order ID validation
 */
export const orderIdValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),
];


/**
 * Validation for calculating delivery fee preview
 */
export const calculateDeliveryFeeValidation = [
  query('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID format'),

  query('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  query('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];



/**
 * Get orders validation
 */
export const getOrdersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(Object.values(OrderStatus))
    .withMessage('Invalid order status'),

  query('seller')
    .optional()
    .isMongoId()
    .withMessage('Invalid seller ID'),

  query('customer')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
];

/**
 * Update order status validation
 */
export const updateOrderStatusValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(OrderStatus))
    .withMessage('Invalid order status'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters'),
];

/**
 * Confirm delivery validation
 */
export const confirmDeliveryValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['customer', 'seller'])
    .withMessage('Role must be either customer or seller'),
];

/**
 * Cancel order validation
 */
export const cancelOrderValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Cancellation reason must be between 10 and 500 characters'),
];

/**
 * Add tracking info validation
 */
export const addTrackingInfoValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID'),

  body('trackingNumber')
    .trim()
    .notEmpty()
    .withMessage('Tracking number is required')
    .isLength({ min: 5, max: 100 })
    .withMessage('Tracking number must be between 5 and 100 characters'),

  body('courierService')
    .trim()
    .notEmpty()
    .withMessage('Courier service is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Courier service must be between 2 and 100 characters'),
];