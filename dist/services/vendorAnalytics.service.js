"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Booking_1 = __importDefault(require("../models/Booking"));
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const Service_1 = __importDefault(require("../models/Service"));
const Review_1 = __importDefault(require("../models/Review"));
// import Payment from '../models/Payment';
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const Order_2 = require("../models/Order");
const logger_1 = __importDefault(require("../utils/logger"));
class AnalyticsService {
    /**
     * Get comprehensive vendor analytics
     */
    async getVendorAnalytics(vendorId, dateRange) {
        // Verify vendor exists
        const vendor = await User_1.default.findById(vendorId);
        if (!vendor || !vendor.isVendor) {
            throw new errors_1.NotFoundError('Vendor not found');
        }
        // Set default date range (last 30 days)
        const endDate = dateRange?.endDate || new Date();
        const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateFilter = {
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            },
        };
        // Fetch all data in parallel
        const [bookingsData, ordersData, productsData, servicesData, reviewsData, paymentsData,] = await Promise.all([
            this.getBookingsAnalytics(vendorId, dateFilter),
            this.getOrdersAnalytics(vendorId, dateFilter),
            this.getProductsAnalytics(vendorId),
            this.getServicesAnalytics(vendorId),
            this.getReviewsAnalytics(vendorId),
            this.getPaymentsAnalytics(vendorId, dateFilter),
        ]);
        // Calculate overview
        const overview = {
            totalRevenue: paymentsData.totalRevenue,
            totalOrders: ordersData.total,
            totalBookings: bookingsData.total,
            totalProducts: productsData.total,
            totalServices: servicesData.total,
            averageRating: reviewsData.averageRating,
            totalReviews: reviewsData.total,
            completedBookings: bookingsData.completed,
            completedOrders: ordersData.completed,
            pendingOrders: ordersData.pending,
            pendingBookings: bookingsData.pending,
            activeProducts: productsData.active,
            activeServices: servicesData.active,
        };
        // Calculate performance metrics
        const performance = {
            responseTime: await this.calculateAverageResponseTime(vendorId),
            acceptanceRate: this.calculateRate(bookingsData.accepted, bookingsData.total),
            completionRate: this.calculateRate(bookingsData.completed + ordersData.completed, bookingsData.total + ordersData.total),
            cancellationRate: this.calculateRate(bookingsData.cancelled + ordersData.cancelled, bookingsData.total + ordersData.total),
            onTimeDeliveryRate: await this.calculateOnTimeDeliveryRate(vendorId),
            customerSatisfactionScore: this.calculateSatisfactionScore(reviewsData.averageRating),
        };
        // Get customer analytics
        const customers = await this.getCustomerAnalytics(vendorId);
        logger_1.default.info(`Analytics generated for vendor: ${vendorId}`);
        return {
            overview,
            revenue: paymentsData,
            bookings: bookingsData,
            orders: ordersData,
            products: productsData,
            services: servicesData,
            reviews: reviewsData,
            customers,
            performance,
        };
    }
    /**
     * Get bookings analytics
     */
    async getBookingsAnalytics(vendorId, dateFilter) {
        const bookings = await Booking_1.default.find({
            vendor: vendorId,
            ...dateFilter,
        }).populate('service', 'name basePrice');
        const total = bookings.length;
        const completed = bookings.filter((b) => b.status === types_1.BookingStatus.COMPLETED).length;
        const pending = bookings.filter((b) => b.status === types_1.BookingStatus.PENDING).length;
        const accepted = bookings.filter((b) => b.status === types_1.BookingStatus.ACCEPTED).length;
        const inProgress = bookings.filter((b) => b.status === types_1.BookingStatus.IN_PROGRESS).length;
        const cancelled = bookings.filter((b) => b.status === types_1.BookingStatus.CANCELLED).length;
        const rejected = bookings.filter((b) => b.status === types_1.BookingStatus.CANCELLED && b.rejectedAt).length;
        // Calculate rates
        const completionRate = this.calculateRate(completed, total);
        const cancellationRate = this.calculateRate(cancelled, total);
        // Group by status
        const byStatus = [
            { status: 'completed', count: completed, percentage: this.calculateRate(completed, total) },
            { status: 'pending', count: pending, percentage: this.calculateRate(pending, total) },
            { status: 'accepted', count: accepted, percentage: this.calculateRate(accepted, total) },
            { status: 'inProgress', count: inProgress, percentage: this.calculateRate(inProgress, total) },
            { status: 'cancelled', count: cancelled, percentage: this.calculateRate(cancelled, total) },
        ];
        // Group by period (daily)
        const byPeriod = this.groupByPeriod(bookings, 'createdAt');
        // Top services
        const serviceBookings = bookings.reduce((acc, booking) => {
            const serviceId = booking.service?._id?.toString();
            if (!serviceId)
                return acc;
            if (!acc[serviceId]) {
                acc[serviceId] = {
                    service: booking.service,
                    bookings: 0,
                    revenue: 0,
                };
            }
            acc[serviceId].bookings++;
            if (booking.status === types_1.BookingStatus.COMPLETED) {
                acc[serviceId].revenue += booking.totalAmount || 0;
            }
            return acc;
        }, {});
        const topServices = Object.values(serviceBookings)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        return {
            total,
            completed,
            pending,
            accepted,
            inProgress,
            cancelled,
            rejected,
            completionRate,
            cancellationRate,
            byStatus,
            byPeriod,
            topServices,
        };
    }
    /**
     * Get orders analytics
     */
    async getOrdersAnalytics(vendorId, dateFilter) {
        const orders = await Order_1.default.find({
            seller: vendorId,
            ...dateFilter,
        }).populate('items.product', 'name price');
        const total = orders.length;
        const completed = orders.filter((o) => o.status === Order_2.OrderStatus.COMPLETED).length;
        const pending = orders.filter((o) => o.status === Order_2.OrderStatus.CONFIRMED).length;
        const processing = orders.filter((o) => o.status === Order_2.OrderStatus.PROCESSING).length;
        const shipped = orders.filter((o) => o.status === Order_2.OrderStatus.SHIPPED).length;
        const delivered = orders.filter((o) => o.status === Order_2.OrderStatus.DELIVERED).length;
        const cancelled = orders.filter((o) => o.status === Order_2.OrderStatus.CANCELLED).length;
        // Calculate rates and averages
        const completionRate = this.calculateRate(completed, total);
        const cancellationRate = this.calculateRate(cancelled, total);
        const totalRevenue = orders
            .filter((o) => o.status === Order_2.OrderStatus.COMPLETED)
            .reduce((sum, o) => sum + o.totalAmount, 0);
        const averageOrderValue = total > 0 ? totalRevenue / completed : 0;
        // Group by status
        const byStatus = [
            { status: 'completed', count: completed, percentage: this.calculateRate(completed, total) },
            { status: 'pending', count: pending, percentage: this.calculateRate(pending, total) },
            { status: 'processing', count: processing, percentage: this.calculateRate(processing, total) },
            { status: 'shipped', count: shipped, percentage: this.calculateRate(shipped, total) },
            { status: 'delivered', count: delivered, percentage: this.calculateRate(delivered, total) },
            { status: 'cancelled', count: cancelled, percentage: this.calculateRate(cancelled, total) },
        ];
        // Group by period
        const byPeriod = this.groupByPeriod(orders, 'createdAt', true);
        // Top products
        const productOrders = {};
        orders.forEach((order) => {
            order.items.forEach((item) => {
                const productId = item.product?._id?.toString();
                if (!productId)
                    return;
                if (!productOrders[productId]) {
                    productOrders[productId] = {
                        product: item.product,
                        orders: 0,
                        quantity: 0,
                        revenue: 0,
                    };
                }
                productOrders[productId].orders++;
                productOrders[productId].quantity += item.quantity;
                if (order.status === Order_2.OrderStatus.COMPLETED) {
                    productOrders[productId].revenue += item.subtotal;
                }
            });
        });
        const topProducts = Object.values(productOrders)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        return {
            total,
            completed,
            pending,
            processing,
            shipped,
            delivered,
            cancelled,
            completionRate,
            cancellationRate,
            averageOrderValue,
            byStatus,
            byPeriod,
            topProducts,
        };
    }
    /**
     * Get products analytics
     */
    async getProductsAnalytics(vendorId) {
        const products = await Product_1.default.find({ seller: vendorId });
        const total = products.length;
        const active = products.filter((p) => p.isActive && p.stock > 0).length;
        const outOfStock = products.filter((p) => p.stock === 0).length;
        const lowStock = products.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)).length;
        const approved = products.filter((p) => p.approvalStatus === 'approved').length;
        const pending = products.filter((p) => p.approvalStatus === 'pending').length;
        const rejected = products.filter((p) => p.approvalStatus === 'rejected').length;
        const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalOrders = products.reduce((sum, p) => sum + (p.orders || 0), 0);
        const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;
        // Top performing products
        const topPerforming = products
            .filter((p) => p.approvalStatus === 'approved')
            .map((p) => ({
            product: {
                _id: p._id,
                name: p.name,
                images: p.images,
                price: p.price,
            },
            views: p.views || 0,
            orders: p.orders || 0,
            revenue: p.revenue || 0,
            rating: p.averageRating || 0,
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        return {
            total,
            active,
            outOfStock,
            lowStock,
            approved,
            pending,
            rejected,
            totalViews,
            totalOrders,
            conversionRate,
            topPerforming,
        };
    }
    /**
     * Get services analytics
     */
    async getServicesAnalytics(vendorId) {
        const services = await Service_1.default.find({ vendor: vendorId });
        const total = services.length;
        const active = services.filter((s) => s.isActive).length;
        const approved = services.filter((s) => s.approvalStatus === 'approved').length;
        const pending = services.filter((s) => s.approvalStatus === 'pending').length;
        const rejected = services.filter((s) => s.approvalStatus === 'rejected').length;
        const totalViews = services.reduce((sum, s) => sum + (s.metadata?.views || 0), 0);
        const totalBookings = services.reduce((sum, s) => sum + (s.metadata?.bookings || 0), 0);
        const conversionRate = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;
        // Top performing services
        const topPerforming = services
            .filter((s) => s.isActive)
            .map((s) => ({
            service: {
                _id: s._id,
                name: s.name,
                images: s.images,
                basePrice: s.basePrice,
            },
            views: s.metadata?.views || 0,
            bookings: s.metadata?.bookings || 0,
            revenue: (s.metadata?.completedBookings || 0) * s.basePrice,
            rating: s.metadata?.averageRating || 0,
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        return {
            total,
            active,
            approved,
            pending,
            rejected,
            totalViews,
            totalBookings,
            conversionRate,
            topPerforming,
        };
    }
    /**
     * Get reviews analytics
     */
    async getReviewsAnalytics(vendorId) {
        const reviews = await Review_1.default.find({
            reviewee: vendorId,
            isApproved: true,
            isHidden: false,
        })
            .populate('reviewer', 'firstName lastName avatar')
            .sort({ createdAt: -1 });
        const total = reviews.length;
        const averageRating = total > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
            : 0;
        // Rating distribution
        const distribution = {
            1: reviews.filter((r) => r.rating === 1).length,
            2: reviews.filter((r) => r.rating === 2).length,
            3: reviews.filter((r) => r.rating === 3).length,
            4: reviews.filter((r) => r.rating === 4).length,
            5: reviews.filter((r) => r.rating === 5).length,
        };
        const positiveReviews = reviews.filter((r) => r.rating >= 4).length;
        const negativeReviews = reviews.filter((r) => r.rating <= 2).length;
        const positivePercentage = this.calculateRate(positiveReviews, total);
        const negativePercentage = this.calculateRate(negativeReviews, total);
        const recent = reviews.slice(0, 10);
        return {
            total,
            averageRating: Math.round(averageRating * 10) / 10,
            distribution,
            recent,
            positivePercentage,
            negativePercentage,
        };
    }
    /**
     * Get payments/revenue analytics
     */
    async getPaymentsAnalytics(vendorId, dateFilter) {
        const bookings = await Booking_1.default.find({
            vendor: vendorId,
            ...dateFilter,
        });
        const orders = await Order_1.default.find({
            seller: vendorId,
            ...dateFilter,
        });
        const fromBookings = bookings
            .filter((b) => b.status === types_1.BookingStatus.COMPLETED)
            .reduce((sum, b) => sum + b.totalAmount, 0);
        const fromOrders = orders
            .filter((o) => o.status === Order_2.OrderStatus.COMPLETED)
            .reduce((sum, o) => sum + o.totalAmount, 0);
        const total = fromBookings + fromOrders;
        const pending = bookings
            .filter((b) => b.paymentStatus === 'pending')
            .reduce((sum, b) => sum + b.totalAmount, 0) +
            orders
                .filter((o) => !o.isPaid)
                .reduce((sum, o) => sum + o.totalAmount, 0);
        const inEscrow = bookings
            .filter((b) => b.paymentStatus === 'escrowed')
            .reduce((sum, b) => sum + b.totalAmount, 0) +
            orders
                .filter((o) => o.escrowStatus === 'locked')
                .reduce((sum, o) => sum + o.totalAmount, 0);
        const released = bookings
            .filter((b) => b.paymentStatus === 'released')
            .reduce((sum, b) => sum + b.totalAmount, 0) +
            orders
                .filter((o) => o.escrowStatus === 'released')
                .reduce((sum, o) => sum + o.totalAmount, 0);
        // Combine bookings and orders by period
        const allTransactions = [
            ...bookings.map((b) => ({
                date: b.createdAt,
                revenue: b.status === types_1.BookingStatus.COMPLETED ? b.totalAmount : 0,
                type: 'booking',
            })),
            ...orders.map((o) => ({
                date: o.createdAt,
                revenue: o.status === Order_2.OrderStatus.COMPLETED ? o.totalAmount : 0,
                type: 'order',
            })),
        ].sort((a, b) => a.date.getTime() - b.date.getTime());
        const byPeriod = this.groupRevenueByPeriod(allTransactions);
        return {
            total,
            fromBookings,
            fromOrders,
            pending,
            inEscrow,
            released,
            byPeriod,
        };
    }
    /**
     * Get customer analytics
     */
    async getCustomerAnalytics(vendorId) {
        const bookings = await Booking_1.default.find({ vendor: vendorId })
            .populate('client', 'firstName lastName avatar email');
        const orders = await Order_1.default.find({ seller: vendorId })
            .populate('customer', 'firstName lastName avatar email');
        // Combine customers from bookings and orders
        const customerMap = new Map();
        bookings.forEach((booking) => {
            const customerId = booking.client?._id?.toString();
            if (!customerId)
                return;
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer: booking.client,
                    totalSpent: 0,
                    orders: 0,
                    bookings: 0,
                    lastPurchase: booking.createdAt,
                });
            }
            const data = customerMap.get(customerId);
            data.bookings++;
            if (booking.status === types_1.BookingStatus.COMPLETED) {
                data.totalSpent += booking.totalAmount;
            }
            if (booking.createdAt > data.lastPurchase) {
                data.lastPurchase = booking.createdAt;
            }
        });
        orders.forEach((order) => {
            const customerId = order.customer?._id?.toString();
            if (!customerId)
                return;
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer: order.customer,
                    totalSpent: 0,
                    orders: 0,
                    bookings: 0,
                    lastPurchase: order.createdAt,
                });
            }
            const data = customerMap.get(customerId);
            data.orders++;
            if (order.status === Order_2.OrderStatus.COMPLETED) {
                data.totalSpent += order.totalAmount;
            }
            if (order.createdAt > data.lastPurchase) {
                data.lastPurchase = order.createdAt;
            }
        });
        const customers = Array.from(customerMap.values());
        const total = customers.length;
        const returning = customers.filter((c) => c.orders + c.bookings > 1).length;
        const newCustomers = customers.filter((c) => c.orders + c.bookings === 1).length;
        const returningRate = this.calculateRate(returning, total);
        const topCustomers = customers
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);
        return {
            total,
            returning,
            new: newCustomers,
            returningRate,
            topCustomers,
        };
    }
    /**
     * Calculate average response time
     */
    async calculateAverageResponseTime(vendorId) {
        const bookings = await Booking_1.default.find({
            vendor: vendorId,
            acceptedAt: { $exists: true },
        });
        if (bookings.length === 0)
            return 0;
        const responseTimes = bookings.map((booking) => {
            const created = new Date(booking.createdAt).getTime();
            const accepted = new Date(booking.acceptedAt).getTime();
            return (accepted - created) / (1000 * 60 * 60); // Convert to hours
        });
        return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }
    /**
     * Calculate on-time delivery rate
     */
    async calculateOnTimeDeliveryRate(vendorId) {
        const orders = await Order_1.default.find({
            seller: vendorId,
            status: Order_2.OrderStatus.DELIVERED,
        });
        if (orders.length === 0)
            return 0;
        // For now, return a dummy value
        // You can implement actual logic based on expected vs actual delivery dates
        return 95;
    }
    /**
     * Calculate satisfaction score from rating
     */
    calculateSatisfactionScore(averageRating) {
        return (averageRating / 5) * 100;
    }
    /**
     * Calculate rate/percentage
     */
    calculateRate(value, total) {
        if (total === 0)
            return 0;
        return Math.round((value / total) * 100 * 10) / 10;
    }
    /**
     * Group data by period (daily)
     */
    groupByPeriod(items, dateField, includeRevenue = false) {
        const grouped = items.reduce((acc, item) => {
            const date = new Date(item[dateField]).toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = {
                    date,
                    count: 0,
                    ...(includeRevenue && { revenue: 0 }),
                };
            }
            acc[date].count++;
            if (includeRevenue && item.totalAmount) {
                acc[date].revenue += item.totalAmount;
            }
            return acc;
        }, {});
        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    }
    /**
     * Group revenue by period
     */
    groupRevenueByPeriod(transactions) {
        const grouped = transactions.reduce((acc, txn) => {
            const date = new Date(txn.date).toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = {
                    date,
                    revenue: 0,
                    bookings: 0,
                    orders: 0,
                };
            }
            acc[date].revenue += txn.revenue;
            if (txn.type === 'booking') {
                acc[date].bookings++;
            }
            else {
                acc[date].orders++;
            }
            return acc;
        }, {});
        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    }
    /**
     * Get quick stats for dashboard
     */
    async getVendorQuickStats(vendorId) {
        const vendor = await User_1.default.findById(vendorId);
        if (!vendor || !vendor.isVendor) {
            throw new errors_1.NotFoundError('Vendor not found');
        }
        const [bookingsCount, ordersCount, productsCount, servicesCount, reviewsCount] = await Promise.all([
            Booking_1.default.countDocuments({ vendor: vendorId }),
            Order_1.default.countDocuments({ seller: vendorId }),
            Product_1.default.countDocuments({ seller: vendorId }),
            Service_1.default.countDocuments({ vendor: vendorId }),
            Review_1.default.countDocuments({ reviewee: vendorId, isApproved: true }),
        ]);
        const walletBalance = vendor.walletBalance || 0;
        const rating = vendor.vendorProfile?.rating || 0;
        return {
            walletBalance,
            totalBookings: bookingsCount,
            totalOrders: ordersCount,
            totalProducts: productsCount,
            totalServices: servicesCount,
            totalReviews: reviewsCount,
            averageRating: rating,
        };
    }
}
exports.default = new AnalyticsService();
//# sourceMappingURL=vendorAnalytics.service.js.map