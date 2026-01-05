import { Router } from 'express';
import orderController from '../controllers/order.controller';
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createOrderValidation,
  confirmPaymentValidation,
  orderIdValidation,
  getOrdersValidation,
  updateOrderStatusValidation,
  confirmDeliveryValidation,
  cancelOrderValidation,
  addTrackingInfoValidation,
  calculateDeliveryFeeValidation, // ADD THIS
} from '../validations/order.validation';

const router = Router();

// ==================== CUSTOMER ROUTES ====================

/**
 * @route   GET /api/v1/orders/delivery-fee-preview
 * @desc    Calculate delivery fee preview before order creation
 * @access  Private (Customer)
 */
router.get(
  '/delivery-fee-preview',
  authenticate,
  validate(calculateDeliveryFeeValidation),
  orderController.calculateDeliveryFee
);

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private (Customer)
 */
router.post(
  '/',
  authenticate,
  validate(createOrderValidation),
  orderController.createOrder
);

/**
 * @route   POST /api/v1/orders/:orderId/confirm-payment
 * @desc    Confirm payment (after payment gateway callback)
 * @access  Private
 */
router.post(
  '/:orderId/confirm-payment',
  authenticate,
  validate(confirmPaymentValidation),
  orderController.confirmPayment
);

/**
 * @route   GET /api/v1/orders/customer/my-orders
 * @desc    Get customer's orders
 * @access  Private (Customer)
 */
router.get(
  '/customer/my-orders',
  authenticate,
  validatePagination,
  orderController.getMyOrders
);

/**
 * @route   GET /api/v1/orders/customer/stats
 * @desc    Get customer order statistics
 * @access  Private (Customer)
 */
router.get(
  '/customer/stats',
  authenticate,
  orderController.getCustomerOrderStats
);

/**
 * @route   POST /api/v1/orders/:orderId/confirm-delivery
 * @desc    Confirm delivery (customer or seller)
 * @access  Private
 */
router.post(
  '/:orderId/confirm-delivery',
  authenticate,
  validate(confirmDeliveryValidation),
  orderController.confirmDelivery
);

/**
 * @route   POST /api/v1/orders/:orderId/cancel
 * @desc    Cancel order
 * @access  Private (Customer or Seller)
 */
router.post(
  '/:orderId/cancel',
  authenticate,
  validate(cancelOrderValidation),
  orderController.cancelOrder
);

/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Get order by ID
 * @access  Private
 */
router.get(
  '/:orderId',
  authenticate,
  validate(orderIdValidation),
  orderController.getOrderById
);

// ==================== SELLER ROUTES ====================

/**
 * @route   GET /api/v1/orders/seller/my-orders
 * @desc    Get seller's orders
 * @access  Private (Vendor/Admin)
 */
router.get(
  '/seller/my-orders',
  authenticate,
  validatePagination,
  orderController.getMySellerOrders
);

/**
 * @route   GET /api/v1/orders/seller/stats
 * @desc    Get seller order statistics
 * @access  Private (Vendor/Admin)
 */
router.get(
  '/seller/stats',
  authenticate,
  orderController.getSellerOrderStats
);

/**
 * @route   PATCH /api/v1/orders/:orderId/status
 * @desc    Update order status
 * @access  Private (Seller)
 */
router.patch(
  '/:orderId/status',
  authenticate,
  validate(updateOrderStatusValidation),
  orderController.updateOrderStatus
);

/**
 * @route   POST /api/v1/orders/:orderId/tracking
 * @desc    Add tracking information
 * @access  Private (Seller)
 */
router.post(
  '/:orderId/tracking',
  authenticate,
  validate(addTrackingInfoValidation),
  orderController.addTrackingInfo
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getOrdersValidation),
  orderController.getAllOrders
);

export default router;