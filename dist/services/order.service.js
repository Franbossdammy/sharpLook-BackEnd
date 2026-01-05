"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Order_1 = __importStar(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const mongoose_1 = __importDefault(require("mongoose"));
const delivery_service_1 = __importDefault(require("./delivery.service"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
const transaction_service_1 = __importDefault(require("./transaction.service"));
const subscription_service_1 = __importDefault(require("./subscription.service"));
const socket_service_1 = __importDefault(require("../socket/socket.service"));
const Payment_1 = __importDefault(require("../models/Payment"));
const types_1 = require("../types");
class OrderService {
    /**
     * Generate unique order number
     */
    async generateOrderNumber() {
        const count = await Order_1.default.countDocuments();
        const timestamp = Date.now();
        const orderNumber = `ORD-${timestamp}-${(count + 1).toString().padStart(6, '0')}`;
        return orderNumber;
    }
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(coords1, coords2) {
        const [lon1, lat1] = coords1;
        const [lon2, lat2] = coords2;
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }
    /**
     * Create a new order with distance-based delivery fee
     */
    async createOrder(customerId, orderData) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const orderItems = [];
            let subtotal = 0;
            let seller = null;
            let sellerType = 'vendor';
            let deliveryFee = 0;
            let vendorLocation = null;
            let firstProduct = null;
            let deliveryDistance = 0;
            let deliveryCalculation = null;
            for (const item of orderData.items) {
                const product = await Product_1.default.findById(item.product)
                    .populate('seller')
                    .session(session);
                if (!product) {
                    throw new errors_1.NotFoundError(`Product ${item.product} not found`);
                }
                if (!product.isInStock()) {
                    throw new errors_1.BadRequestError(`Product ${product.name} is out of stock`);
                }
                if (product.stock < item.quantity) {
                    throw new errors_1.BadRequestError(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
                }
                if (!seller) {
                    seller = product.seller._id;
                    sellerType = product.sellerType;
                    firstProduct = product;
                    if (sellerType === 'vendor') {
                        const vendorUser = await User_1.default.findById(seller).session(session);
                        vendorLocation = vendorUser?.vendorProfile?.location || vendorUser?.location;
                    }
                    else {
                        vendorLocation = product.location;
                    }
                }
                else if (seller.toString() !== product.seller._id.toString()) {
                    throw new errors_1.BadRequestError('All products must be from the same seller');
                }
                const price = product.calculateFinalPrice();
                const itemSubtotal = price * item.quantity;
                orderItems.push({
                    product: product._id,
                    name: product.name,
                    price,
                    quantity: item.quantity,
                    selectedVariant: item.selectedVariant,
                    subtotal: itemSubtotal,
                });
                subtotal += itemSubtotal;
                await product.decrementStock(item.quantity);
            }
            if (orderData.deliveryType === Order_1.DeliveryType.HOME_DELIVERY) {
                if (!firstProduct) {
                    throw new errors_1.BadRequestError('No products found in order');
                }
                if (firstProduct.deliveryOptions.freeDelivery) {
                    deliveryFee = 0;
                    logger_1.default.info('Free delivery applied to order');
                }
                else {
                    delivery_service_1.default.validateLocations(vendorLocation, {
                        type: 'Point',
                        coordinates: orderData.deliveryAddress?.coordinates
                    });
                    deliveryCalculation = delivery_service_1.default.calculateDeliveryFeeFromCoordinates(vendorLocation.coordinates, orderData.deliveryAddress.coordinates, firstProduct.deliveryOptions?.deliveryPricing || undefined, false);
                    if (!deliveryCalculation.canDeliver) {
                        throw new errors_1.BadRequestError(deliveryCalculation.message || 'Delivery not available to your location');
                    }
                    deliveryFee = deliveryCalculation.deliveryFee;
                    deliveryDistance = deliveryCalculation.distance;
                    logger_1.default.info(`Delivery fee calculated: ₦${deliveryFee} for ${deliveryCalculation.distance}km - ETA: ${deliveryCalculation.estimatedDeliveryTime}`);
                }
            }
            const totalAmount = subtotal + deliveryFee;
            const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Generate orderNumber manually
            const orderNumber = await this.generateOrderNumber();
            // Create order with orderNumber
            const orderDoc = new Order_1.default({
                orderNumber,
                customer: customerId,
                seller: seller,
                sellerType,
                items: orderItems,
                subtotal,
                deliveryFee,
                totalAmount,
                deliveryType: orderData.deliveryType,
                deliveryAddress: orderData.deliveryAddress,
                paymentMethod: orderData.paymentMethod,
                paymentReference,
                escrowedAmount: totalAmount,
                customerNotes: orderData.customerNotes,
                status: Order_1.OrderStatus.PENDING,
                statusHistory: [{
                        status: Order_1.OrderStatus.PENDING,
                        updatedBy: mongoose_1.default.Types.ObjectId.createFromHexString(customerId),
                        updatedAt: new Date(),
                    }],
            });
            // Save with session
            await orderDoc.save({ session });
            // Populate seller for notification
            await orderDoc.populate('seller', 'firstName lastName email');
            await session.commitTransaction();
            // ✅ Notify seller about new order with distance info
            try {
                await notificationHelper_1.default.notifySellerNewOrder(orderDoc, deliveryDistance);
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify seller about new order:', notifyError);
            }
            // ✅ Notify customer about delivery fee calculation
            if (deliveryFee > 0 && deliveryCalculation) {
                try {
                    await notificationHelper_1.default.notifyDeliveryFeeCalculated(customerId, orderDoc._id.toString(), deliveryFee, deliveryDistance, deliveryCalculation.estimatedDeliveryTime);
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify customer about delivery fee:', notifyError);
                }
            }
            logger_1.default.info(`Order created: ${orderDoc._id} (${orderNumber}) with delivery fee: ₦${deliveryFee}`);
            return orderDoc;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    /**
     * Calculate delivery fee preview (before order creation)
     */
    async calculateDeliveryFeePreview(productId, customerLocation) {
        const product = await Product_1.default.findById(productId).populate('seller');
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        let vendorLocation = null;
        if (product.sellerType === 'vendor') {
            const vendorUser = await User_1.default.findById(product.seller);
            vendorLocation = vendorUser?.vendorProfile?.location || vendorUser?.location;
        }
        else {
            vendorLocation = product.location;
        }
        delivery_service_1.default.validateLocations(vendorLocation, {
            type: 'Point',
            coordinates: customerLocation.coordinates
        });
        const deliveryCalculation = delivery_service_1.default.calculateDeliveryFeeFromCoordinates(vendorLocation.coordinates, customerLocation.coordinates, product.deliveryOptions?.deliveryPricing || undefined, product.deliveryOptions.freeDelivery || false);
        return deliveryCalculation;
    }
    /**
     * Update order payment status (after payment confirmation)
     */
    async confirmPayment(orderId, paymentId) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        order.isPaid = true;
        order.paidAt = new Date();
        order.payment = mongoose_1.default.Types.ObjectId.createFromHexString(paymentId);
        order.escrowStatus = 'locked';
        order.escrowedAt = new Date();
        order.status = Order_1.OrderStatus.CONFIRMED;
        await order.addStatusUpdate(Order_1.OrderStatus.CONFIRMED, order.customer.toString(), 'Payment confirmed');
        logger_1.default.info(`Order payment confirmed: ${orderId}`);
        return order;
    }
    /**
     * Get order by ID
     */
    async getOrderById(orderId) {
        const order = await Order_1.default.findById(orderId)
            .populate('customer', 'firstName lastName email phone avatar')
            .populate('seller', 'firstName lastName email phone avatar vendorProfile')
            .populate('items.product', 'name images')
            .populate('payment');
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        return order;
    }
    /**
     * Get customer orders
     */
    async getCustomerOrders(customerId, status, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = { customer: customerId };
        if (status) {
            query.status = status;
        }
        const [orders, total] = await Promise.all([
            Order_1.default.find(query)
                .populate('seller', 'firstName lastName avatar vendorProfile')
                .populate('items.product', 'name images')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Order_1.default.countDocuments(query),
        ]);
        return {
            orders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get seller orders
     */
    async getSellerOrders(sellerId, status, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = { seller: sellerId };
        if (status) {
            query.status = status;
        }
        const [orders, total] = await Promise.all([
            Order_1.default.find(query)
                .populate('customer', 'firstName lastName phone avatar')
                .populate('items.product', 'name images')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Order_1.default.countDocuments(query),
        ]);
        return {
            orders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update order status (seller)
     */
    async updateOrderStatus(orderId, sellerId, status, note) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        if (order.seller.toString() !== sellerId) {
            throw new errors_1.ForbiddenError('You can only update your own orders');
        }
        if (!order.isPaid) {
            throw new errors_1.BadRequestError('Order must be paid before status can be updated');
        }
        // Validate status transition
        const validTransitions = {
            [Order_1.OrderStatus.CONFIRMED]: [Order_1.OrderStatus.PROCESSING, Order_1.OrderStatus.CANCELLED],
            [Order_1.OrderStatus.PROCESSING]: [Order_1.OrderStatus.SHIPPED, Order_1.OrderStatus.CANCELLED],
            [Order_1.OrderStatus.SHIPPED]: [Order_1.OrderStatus.OUT_FOR_DELIVERY],
            [Order_1.OrderStatus.OUT_FOR_DELIVERY]: [Order_1.OrderStatus.DELIVERED],
        };
        if (!validTransitions[order.status]?.includes(status)) {
            throw new errors_1.BadRequestError(`Cannot transition from ${order.status} to ${status}`);
        }
        await order.addStatusUpdate(status, sellerId, note);
        // ✅ Notify customer about delivery status updates
        if (status === Order_1.OrderStatus.SHIPPED || status === Order_1.OrderStatus.OUT_FOR_DELIVERY) {
            try {
                let estimatedTime;
                // Calculate ETA based on delivery distance if available
                if (order.deliveryAddress?.coordinates && order.seller) {
                    const seller = await User_1.default.findById(order.seller);
                    const vendorLocation = seller?.vendorProfile?.location || seller?.location;
                    if (vendorLocation?.coordinates) {
                        const distance = this.calculateDistance(vendorLocation.coordinates, order.deliveryAddress.coordinates);
                        // Rough estimate: 30 km/h average speed
                        const hoursToDeliver = distance / 30;
                        const daysToDeliver = Math.ceil(hoursToDeliver / 8); // 8 hour work day
                        if (status === Order_1.OrderStatus.SHIPPED) {
                            estimatedTime = daysToDeliver === 1 ? 'Tomorrow' : `${daysToDeliver} days`;
                        }
                        else if (status === Order_1.OrderStatus.OUT_FOR_DELIVERY) {
                            estimatedTime = hoursToDeliver < 2 ? 'Within 2 hours' : `${Math.ceil(hoursToDeliver)} hours`;
                        }
                    }
                }
                await notificationHelper_1.default.notifyOrderDelivery(order, status === Order_1.OrderStatus.SHIPPED ? 'shipped' : 'out_for_delivery', estimatedTime);
            }
            catch (notifyError) {
                logger_1.default.error('Failed to notify customer about order status:', notifyError);
            }
        }
        logger_1.default.info(`Order status updated: ${orderId} to ${status}`);
        return order;
    }
    /**
     * Confirm delivery (customer or seller)
     */
    async confirmDelivery(orderId, userId, role) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        // Verify user
        if (role === 'customer' && order.customer.toString() !== userId) {
            throw new errors_1.ForbiddenError('Unauthorized');
        }
        if (role === 'seller' && order.seller.toString() !== userId) {
            throw new errors_1.ForbiddenError('Unauthorized');
        }
        if (order.status !== Order_1.OrderStatus.DELIVERED) {
            throw new errors_1.BadRequestError('Order must be in delivered status');
        }
        // ✅ CHECK FOR ACTIVE DISPUTE - CRITICAL!
        if (order.hasDispute) {
            throw new errors_1.BadRequestError('Cannot confirm delivery while there is an active dispute. ' +
                'Please resolve the dispute first.');
        }
        if (role === 'customer') {
            order.customerConfirmedDelivery = true;
            order.customerConfirmedAt = new Date();
        }
        else {
            order.sellerConfirmedDelivery = true;
            order.sellerConfirmedAt = new Date();
        }
        // If both parties confirmed, complete the order and release escrow
        if (order.customerConfirmedDelivery && order.sellerConfirmedDelivery) {
            order.status = Order_1.OrderStatus.COMPLETED;
            order.escrowStatus = 'released';
            order.escrowReleaseDate = new Date();
            await order.addStatusUpdate(Order_1.OrderStatus.COMPLETED, userId, 'Both parties confirmed delivery - escrow released');
            // ✅ RELEASE FUNDS TO SELLER
            await this.releaseFundsToSeller(order);
        }
        await order.save();
        logger_1.default.info(`Order delivery confirmed by ${role}: ${orderId}`);
        return order;
    }
    /**
    * Cancel order
    */
    async cancelOrder(orderId, userId, reason) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        if (!order.canBeCancelled()) {
            throw new errors_1.BadRequestError('Order cannot be cancelled at this stage');
        }
        // Verify user is customer or seller
        const isCustomer = order.customer.toString() === userId;
        const isSeller = order.seller.toString() === userId;
        if (!isCustomer && !isSeller) {
            throw new errors_1.ForbiddenError('Unauthorized');
        }
        order.status = Order_1.OrderStatus.CANCELLED;
        order.cancellationReason = reason;
        order.cancelledBy = mongoose_1.default.Types.ObjectId.createFromHexString(userId);
        order.cancelledAt = new Date();
        // ✅ REFUND IF PAID
        if (order.isPaid) {
            await this.processOrderRefund(order);
        }
        // Restore product stock
        for (const item of order.items) {
            const product = await Product_1.default.findById(item.product);
            if (product) {
                await product.incrementStock(item.quantity);
            }
        }
        await order.addStatusUpdate(Order_1.OrderStatus.CANCELLED, userId, reason);
        logger_1.default.info(`Order cancelled: ${orderId}`);
        // ✅ Notify both parties
        const cancelledByRole = isCustomer ? 'customer' : 'seller';
        await notificationHelper_1.default.notifyOrderCancelled(order, cancelledByRole, reason);
        return order;
    }
    /**
     * Process refund for cancelled order
     */
    async processOrderRefund(order) {
        const payment = await Payment_1.default.findById(order.payment);
        if (!payment) {
            logger_1.default.error(`Payment not found for order ${order._id}`);
            return;
        }
        // Find the customer
        const customer = await User_1.default.findById(order.customer);
        if (!customer) {
            logger_1.default.error(`Customer not found for order ${order._id}`);
            return;
        }
        // Refund to wallet regardless of payment method
        const previousBalance = customer.walletBalance || 0;
        customer.walletBalance = previousBalance + order.totalAmount;
        await customer.save();
        // Create refund transaction
        await transaction_service_1.default.createTransaction({
            userId: order.customer.toString(),
            type: types_1.TransactionType.REFUND,
            amount: order.totalAmount,
            description: `Refund for cancelled order #${order.orderNumber}`,
            order: order._id.toString(),
            payment: payment._id.toString(),
        });
        // Update payment and order status
        payment.status = types_1.PaymentStatus.REFUNDED;
        await payment.save();
        order.escrowStatus = 'refunded';
        // Log refund
        const paymentMethodLabel = payment.paymentMethod === 'wallet' || payment.paymentMethod === 'card'
            ? 'card payment'
            : 'wallet';
        logger_1.default.info(`💰 Refunded ₦${order.totalAmount.toLocaleString()} to customer wallet ` +
            `(original payment: ${paymentMethodLabel}) for order ${order._id}`);
        // ✅ Notify customer about refund
        await notificationHelper_1.default.notifyOrderRefundProcessed(order, order.totalAmount, customer.walletBalance, payment.paymentMethod === 'wallet' || payment.paymentMethod === 'card'
            ? 'Refunded to your wallet (original payment was via card)'
            : 'Refunded to your wallet');
        // ✅ Emit real-time event
        const refundMessage = payment.paymentMethod === 'wallet' || payment.paymentMethod === 'card'
            ? 'Refunded to your wallet (original payment was via card)'
            : 'Refunded to your wallet';
        socket_service_1.default.emitPaymentEvent(order.customer.toString(), 'order:refund:success', {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            newBalance: customer.walletBalance,
            previousBalance: previousBalance,
            paymentMethod: payment.paymentMethod,
            message: refundMessage,
        });
        logger_1.default.info(`✅ Refund completed: Customer ${order.customer} | ` +
            `Amount: ₦${order.totalAmount.toLocaleString()} | ` +
            `New Balance: ₦${customer.walletBalance.toLocaleString()}`);
    }
    /**
     * Get all orders (admin)
     */
    async getAllOrders(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.seller) {
            query.seller = filters.seller;
        }
        if (filters?.customer) {
            query.customer = filters.customer;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }
        const [orders, total] = await Promise.all([
            Order_1.default.find(query)
                .populate('customer', 'firstName lastName email phone')
                .populate('seller', 'firstName lastName email phone vendorProfile')
                .populate('items.product', 'name images')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Order_1.default.countDocuments(query),
        ]);
        return {
            orders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Add tracking information (seller)
     */
    async addTrackingInfo(orderId, sellerId, trackingNumber, courierService) {
        const order = await Order_1.default.findById(orderId);
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        if (order.seller.toString() !== sellerId) {
            throw new errors_1.ForbiddenError('Unauthorized');
        }
        order.trackingNumber = trackingNumber;
        order.courierService = courierService;
        await order.save();
        logger_1.default.info(`Tracking info added to order: ${orderId}`);
        return order;
    }
    /**
     * Release escrow funds to seller
     */
    async releaseFundsToSeller(order) {
        // Get payment record
        const payment = await Payment_1.default.findById(order.payment);
        if (!payment) {
            logger_1.default.error(`Payment not found for order ${order._id}`);
            return;
        }
        // Find the seller
        const seller = await User_1.default.findById(order.seller);
        if (!seller) {
            logger_1.default.error(`Seller not found for order ${order._id}`);
            return;
        }
        // Get commission rate
        const commissionRate = await subscription_service_1.default.getCommissionRate(order.seller.toString());
        // Calculate amounts
        const platformFee = Math.round((order.totalAmount * commissionRate) / 100);
        const sellerAmount = order.totalAmount - platformFee;
        // Add money to seller's wallet
        const previousBalance = seller.walletBalance || 0;
        seller.walletBalance = previousBalance + sellerAmount;
        await seller.save();
        // Create transaction for seller earnings
        await transaction_service_1.default.createTransaction({
            userId: seller._id.toString(),
            type: types_1.TransactionType.ORDER_EARNING,
            amount: sellerAmount,
            description: `Earnings from completed order #${order.orderNumber} (after ${commissionRate}% platform fee)`,
            order: order._id.toString(),
            payment: payment._id.toString(),
        });
        // Update payment record
        payment.escrowStatus = 'released';
        payment.escrowedAt = new Date();
        await payment.save();
        logger_1.default.info(`✅ Released ₦${sellerAmount.toLocaleString()} to seller ${seller._id} ` +
            `(Platform fee: ₦${platformFee.toLocaleString()}) for order ${order._id}`);
        // ✅ Notify seller about payment
        await notificationHelper_1.default.notifySellerPaymentReleased(order, sellerAmount, platformFee, seller.walletBalance);
        // ✅ Emit real-time event
        socket_service_1.default.emitPaymentEvent(seller._id.toString(), 'order:payment:released', {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            amount: sellerAmount,
            platformFee: platformFee,
            newBalance: seller.walletBalance,
        });
    }
}
exports.default = new OrderService();
//# sourceMappingURL=order.service.js.map