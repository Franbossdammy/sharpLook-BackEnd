"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const order_service_1 = __importDefault(require("../services/order.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const Order_1 = require("../models/Order");
// import logger from '../utils/logger';
class OrderController {
    constructor() {
        /**
         * Calculate delivery fee preview
         * GET /api/v1/orders/delivery-fee-preview
         */
        this.calculateDeliveryFee = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId, latitude, longitude } = req.query;
            const deliveryCalculation = await order_service_1.default.calculateDeliveryFeePreview(productId, {
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
            });
            return response_1.default.success(res, deliveryCalculation.canDeliver
                ? 'Delivery fee calculated successfully'
                : 'Delivery not available', {
                ...deliveryCalculation,
            });
        });
        /**
         * Create a new order
         * POST /api/v1/orders
         */
        this.createOrder = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const customerId = req.user.id;
            const order = await order_service_1.default.createOrder(customerId, req.body);
            return response_1.default.success(res, 'Order created successfully. Please proceed to payment.', {
                order,
                paymentReference: order.paymentReference,
                totalAmount: order.totalAmount,
            }, 201);
        });
        /**
         * Confirm payment (called after payment gateway webhook)
         * POST /api/v1/orders/:orderId/confirm-payment
         */
        this.confirmPayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const { paymentId } = req.body;
            const order = await order_service_1.default.confirmPayment(orderId, paymentId);
            return response_1.default.success(res, 'Payment confirmed. Order is now being processed.', {
                order,
            });
        });
        /**
         * Get order by ID
         * GET /api/v1/orders/:orderId
         */
        this.getOrderById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const order = await order_service_1.default.getOrderById(orderId);
            return response_1.default.success(res, 'Order retrieved successfully', {
                order,
            });
        });
        /**
         * Get customer's orders
         * GET /api/v1/orders/customer/my-orders
         */
        this.getMyOrders = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const customerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const result = await order_service_1.default.getCustomerOrders(customerId, status, page, limit);
            return response_1.default.paginated(res, 'Your orders retrieved successfully', result.orders, page, limit, result.total);
        });
        /**
         * Get seller's orders
         * GET /api/v1/orders/seller/my-orders
         */
        this.getMySellerOrders = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const sellerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const result = await order_service_1.default.getSellerOrders(sellerId, status, page, limit);
            return response_1.default.paginated(res, 'Your orders retrieved successfully', result.orders, page, limit, result.total);
        });
        /**
         * Get all orders (admin)
         * GET /api/v1/orders
         */
        this.getAllOrders = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                seller: req.query.seller,
                customer: req.query.customer,
            };
            if (req.query.startDate) {
                filters.startDate = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filters.endDate = new Date(req.query.endDate);
            }
            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const result = await order_service_1.default.getAllOrders(filters, page, limit);
            return response_1.default.paginated(res, 'Orders retrieved successfully', result.orders, page, limit, result.total);
        });
        /**
         * Update order status (seller)
         * PATCH /api/v1/orders/:orderId/status
         */
        this.updateOrderStatus = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const sellerId = req.user.id;
            const { status, note } = req.body;
            const order = await order_service_1.default.updateOrderStatus(orderId, sellerId, status, note);
            return response_1.default.success(res, 'Order status updated successfully', {
                order,
            });
        });
        /**
         * Confirm delivery (customer or seller)
         * POST /api/v1/orders/:orderId/confirm-delivery
         */
        this.confirmDelivery = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const userId = req.user.id;
            const { role } = req.body; // 'customer' or 'seller'
            const order = await order_service_1.default.confirmDelivery(orderId, userId, role);
            const message = order.status === Order_1.OrderStatus.COMPLETED
                ? 'Delivery confirmed. Order completed and payment released to seller!'
                : `Delivery confirmed by ${role}. Waiting for ${role === 'customer' ? 'seller' : 'customer'} confirmation.`;
            return response_1.default.success(res, message, {
                order,
                isCompleted: order.status === Order_1.OrderStatus.COMPLETED,
            });
        });
        /**
         * Cancel order
         * POST /api/v1/orders/:orderId/cancel
         */
        this.cancelOrder = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const userId = req.user.id;
            const { reason } = req.body;
            const order = await order_service_1.default.cancelOrder(orderId, userId, reason);
            return response_1.default.success(res, 'Order cancelled successfully', {
                order,
                refundIssued: order.isPaid,
            });
        });
        /**
         * Add tracking information (seller)
         * POST /api/v1/orders/:orderId/tracking
         */
        this.addTrackingInfo = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const sellerId = req.user.id;
            const { trackingNumber, courierService } = req.body;
            const order = await order_service_1.default.addTrackingInfo(orderId, sellerId, trackingNumber, courierService);
            return response_1.default.success(res, 'Tracking information added successfully', {
                order,
            });
        });
        /**
         * Get order statistics (seller)
         * GET /api/v1/orders/seller/stats
         */
        this.getSellerOrderStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const sellerId = req.user.id;
            // Get counts for different statuses
            const [pendingOrders, processingOrders, shippedOrders, completedOrders, cancelledOrders,] = await Promise.all([
                order_service_1.default.getSellerOrders(sellerId, Order_1.OrderStatus.PENDING, 1, 1),
                order_service_1.default.getSellerOrders(sellerId, Order_1.OrderStatus.PROCESSING, 1, 1),
                order_service_1.default.getSellerOrders(sellerId, Order_1.OrderStatus.SHIPPED, 1, 1),
                order_service_1.default.getSellerOrders(sellerId, Order_1.OrderStatus.COMPLETED, 1, 1),
                order_service_1.default.getSellerOrders(sellerId, Order_1.OrderStatus.CANCELLED, 1, 1),
            ]);
            return response_1.default.success(res, 'Order statistics retrieved successfully', {
                stats: {
                    pending: pendingOrders.total,
                    processing: processingOrders.total,
                    shipped: shippedOrders.total,
                    completed: completedOrders.total,
                    cancelled: cancelledOrders.total,
                    total: pendingOrders.total + processingOrders.total + shippedOrders.total +
                        completedOrders.total + cancelledOrders.total,
                },
            });
        });
        /**
         * Get customer order statistics
         * GET /api/v1/orders/customer/stats
         */
        this.getCustomerOrderStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const customerId = req.user.id;
            const [pendingOrders, processingOrders, deliveredOrders, completedOrders, cancelledOrders,] = await Promise.all([
                order_service_1.default.getCustomerOrders(customerId, Order_1.OrderStatus.PENDING, 1, 1),
                order_service_1.default.getCustomerOrders(customerId, Order_1.OrderStatus.PROCESSING, 1, 1),
                order_service_1.default.getCustomerOrders(customerId, Order_1.OrderStatus.DELIVERED, 1, 1),
                order_service_1.default.getCustomerOrders(customerId, Order_1.OrderStatus.COMPLETED, 1, 1),
                order_service_1.default.getCustomerOrders(customerId, Order_1.OrderStatus.CANCELLED, 1, 1),
            ]);
            return response_1.default.success(res, 'Order statistics retrieved successfully', {
                stats: {
                    pending: pendingOrders.total,
                    processing: processingOrders.total,
                    delivered: deliveredOrders.total,
                    completed: completedOrders.total,
                    cancelled: cancelledOrders.total,
                    total: pendingOrders.total + processingOrders.total + deliveredOrders.total +
                        completedOrders.total + cancelledOrders.total,
                },
            });
        });
    }
}
exports.default = new OrderController();
//# sourceMappingURL=order.controller.js.map