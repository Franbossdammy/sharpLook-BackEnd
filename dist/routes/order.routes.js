"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = __importDefault(require("../controllers/order.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const order_validation_1 = require("../validations/order.validation");
const router = (0, express_1.Router)();
// ==================== CUSTOMER ROUTES ====================
/**
 * @route   GET /api/v1/orders/delivery-fee-preview
 * @desc    Calculate delivery fee preview before order creation
 * @access  Private (Customer)
 */
router.get('/delivery-fee-preview', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.calculateDeliveryFeeValidation), order_controller_1.default.calculateDeliveryFee);
/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private (Customer)
 */
router.post('/', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.createOrderValidation), order_controller_1.default.createOrder);
/**
 * @route   POST /api/v1/orders/:orderId/confirm-payment
 * @desc    Confirm payment (after payment gateway callback)
 * @access  Private
 */
router.post('/:orderId/confirm-payment', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.confirmPaymentValidation), order_controller_1.default.confirmPayment);
/**
 * @route   GET /api/v1/orders/customer/my-orders
 * @desc    Get customer's orders
 * @access  Private (Customer)
 */
router.get('/customer/my-orders', auth_1.authenticate, validate_1.validatePagination, order_controller_1.default.getMyOrders);
/**
 * @route   GET /api/v1/orders/customer/stats
 * @desc    Get customer order statistics
 * @access  Private (Customer)
 */
router.get('/customer/stats', auth_1.authenticate, order_controller_1.default.getCustomerOrderStats);
/**
 * @route   POST /api/v1/orders/:orderId/confirm-delivery
 * @desc    Confirm delivery (customer or seller)
 * @access  Private
 */
router.post('/:orderId/confirm-delivery', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.confirmDeliveryValidation), order_controller_1.default.confirmDelivery);
/**
 * @route   POST /api/v1/orders/:orderId/cancel
 * @desc    Cancel order
 * @access  Private (Customer or Seller)
 */
router.post('/:orderId/cancel', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.cancelOrderValidation), order_controller_1.default.cancelOrder);
/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:orderId', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.orderIdValidation), order_controller_1.default.getOrderById);
// ==================== SELLER ROUTES ====================
/**
 * @route   GET /api/v1/orders/seller/my-orders
 * @desc    Get seller's orders
 * @access  Private (Vendor/Admin)
 */
router.get('/seller/my-orders', auth_1.authenticate, validate_1.validatePagination, order_controller_1.default.getMySellerOrders);
/**
 * @route   GET /api/v1/orders/seller/stats
 * @desc    Get seller order statistics
 * @access  Private (Vendor/Admin)
 */
router.get('/seller/stats', auth_1.authenticate, order_controller_1.default.getSellerOrderStats);
/**
 * @route   PATCH /api/v1/orders/:orderId/status
 * @desc    Update order status
 * @access  Private (Seller)
 */
router.patch('/:orderId/status', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.updateOrderStatusValidation), order_controller_1.default.updateOrderStatus);
/**
 * @route   POST /api/v1/orders/:orderId/tracking
 * @desc    Add tracking information
 * @access  Private (Seller)
 */
router.post('/:orderId/tracking', auth_1.authenticate, (0, validate_1.validate)(order_validation_1.addTrackingInfoValidation), order_controller_1.default.addTrackingInfo);
// ==================== ADMIN ROUTES ====================
/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (admin)
 * @access  Private (Admin)
 */
router.get('/', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(order_validation_1.getOrdersValidation), order_controller_1.default.getAllOrders);
exports.default = router;
//# sourceMappingURL=order.routes.js.map