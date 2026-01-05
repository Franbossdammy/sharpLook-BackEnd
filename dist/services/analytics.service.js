"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Service_1 = __importDefault(require("../models/Service"));
const Review_1 = __importDefault(require("../models/Review"));
const Dispute_1 = __importDefault(require("../models/Dispute"));
const Referral_1 = __importDefault(require("../models/Referral"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class AnalyticsService {
    /**
     * Get dashboard overview
     */
    async getDashboardOverview() {
        const [totalUsers, totalVendors, activeVendors, totalBookings, completedBookings, totalRevenue, monthlyRevenue, activeBookings, totalServices, avgRating,] = await Promise.all([
            User_1.default.countDocuments(),
            User_1.default.countDocuments({ isVendor: true }),
            User_1.default.countDocuments({ isVendor: true, 'vendorProfile.isVerified': true }),
            Booking_1.default.countDocuments(),
            Booking_1.default.countDocuments({ status: 'completed' }),
            Payment_1.default.aggregate([
                { $match: { status: 'released' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Payment_1.default.aggregate([
                {
                    $match: {
                        status: 'released',
                        createdAt: { $gte: new Date(new Date().setDate(1)) }, // This month
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Booking_1.default.countDocuments({ status: { $in: ['pending', 'accepted', 'in_progress'] } }),
            Service_1.default.countDocuments({ isActive: true }),
            Review_1.default.aggregate([
                { $match: { isApproved: true, isHidden: false } },
                { $group: { _id: null, avg: { $avg: '$rating' } } },
            ]),
        ]);
        return {
            users: {
                total: totalUsers,
                vendors: totalVendors,
                clients: totalUsers - totalVendors,
                activeVendors,
            },
            bookings: {
                total: totalBookings,
                completed: completedBookings,
                active: activeBookings,
                completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(2) : 0,
            },
            revenue: {
                total: totalRevenue[0]?.total || 0,
                thisMonth: monthlyRevenue[0]?.total || 0,
            },
            services: {
                total: totalServices,
                avgRating: avgRating[0]?.avg ? avgRating[0].avg.toFixed(2) : 0,
            },
        };
    }
    /**
     * Get user analytics
     */
    async getUserAnalytics(filters) {
        const dateFilter = {};
        if (filters?.startDate || filters?.endDate) {
            dateFilter.createdAt = {};
            if (filters.startDate)
                dateFilter.createdAt.$gte = filters.startDate;
            if (filters.endDate)
                dateFilter.createdAt.$lte = filters.endDate;
        }
        const [totalUsers, usersByRole, usersByMonth, newUsersToday] = await Promise.all([
            User_1.default.countDocuments(dateFilter),
            User_1.default.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: { $cond: ['$isVendor', 'vendor', 'client'] },
                        count: { $sum: 1 },
                    },
                },
            ]),
            User_1.default.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ]),
            User_1.default.countDocuments({
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            }),
        ]);
        return {
            total: totalUsers,
            byRole: usersByRole,
            byMonth: usersByMonth,
            newToday: newUsersToday,
        };
    }
    /**
     * Get booking analytics
     */
    async getBookingAnalytics(filters) {
        const dateFilter = {};
        if (filters?.startDate || filters?.endDate) {
            dateFilter.createdAt = {};
            if (filters.startDate)
                dateFilter.createdAt.$gte = filters.startDate;
            if (filters.endDate)
                dateFilter.createdAt.$lte = filters.endDate;
        }
        const [totalBookings, bookingsByStatus, bookingsByType, bookingsByMonth, avgBookingValue, topServices,] = await Promise.all([
            Booking_1.default.countDocuments(dateFilter),
            Booking_1.default.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Booking_1.default.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$bookingType', count: { $sum: 1 } } },
            ]),
            Booking_1.default.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                        },
                        count: { $sum: 1 },
                        revenue: { $sum: '$totalAmount' },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ]),
            Booking_1.default.aggregate([
                { $match: dateFilter },
                { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
            ]),
            Booking_1.default.aggregate([
                { $match: { ...dateFilter, status: 'completed' } },
                { $group: { _id: '$service', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'services',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'service',
                    },
                },
                { $unwind: '$service' },
                {
                    $project: {
                        serviceName: '$service.name',
                        bookings: '$count',
                    },
                },
            ]),
        ]);
        return {
            total: totalBookings,
            byStatus: bookingsByStatus,
            byType: bookingsByType,
            byMonth: bookingsByMonth,
            avgValue: avgBookingValue[0]?.avg || 0,
            topServices,
        };
    }
    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(filters) {
        const dateFilter = {};
        if (filters?.startDate || filters?.endDate) {
            dateFilter.createdAt = {};
            if (filters.startDate)
                dateFilter.createdAt.$gte = filters.startDate;
            if (filters.endDate)
                dateFilter.createdAt.$lte = filters.endDate;
        }
        const [totalRevenue, revenueByMonth, platformFees, avgTransactionValue, paymentMethods,] = await Promise.all([
            Payment_1.default.aggregate([
                { $match: { ...dateFilter, status: 'released' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Payment_1.default.aggregate([
                { $match: { ...dateFilter, status: 'released' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                        },
                        revenue: { $sum: '$amount' },
                        platformFee: { $sum: '$platformFee' },
                        vendorAmount: { $sum: '$vendorAmount' },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ]),
            Payment_1.default.aggregate([
                { $match: { ...dateFilter, status: 'released' } },
                { $group: { _id: null, total: { $sum: '$platformFee' } } },
            ]),
            Payment_1.default.aggregate([
                { $match: { ...dateFilter, status: { $in: ['completed', 'released'] } } },
                { $group: { _id: null, avg: { $avg: '$amount' } } },
            ]),
            Payment_1.default.aggregate([
                { $match: { ...dateFilter, status: { $in: ['completed', 'released'] } } },
                { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
            ]),
        ]);
        return {
            totalRevenue: totalRevenue[0]?.total || 0,
            platformFees: platformFees[0]?.total || 0,
            vendorPayouts: (totalRevenue[0]?.total || 0) - (platformFees[0]?.total || 0),
            avgTransactionValue: avgTransactionValue[0]?.avg || 0,
            byMonth: revenueByMonth,
            paymentMethods,
        };
    }
    /**
     * Get vendor performance
     */
    async getVendorPerformance(vendorId) {
        const matchFilter = vendorId ? { vendor: vendorId } : {};
        const [topVendors, avgResponseTime, vendorRatings,] = await Promise.all([
            Booking_1.default.aggregate([
                { $match: { ...matchFilter, status: 'completed' } },
                {
                    $group: {
                        _id: '$vendor',
                        totalBookings: { $sum: 1 },
                        totalRevenue: { $sum: '$totalAmount' },
                    },
                },
                { $sort: { totalRevenue: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendor',
                    },
                },
                { $unwind: '$vendor' },
                {
                    $project: {
                        vendorName: {
                            $concat: ['$vendor.firstName', ' ', '$vendor.lastName'],
                        },
                        totalBookings: 1,
                        totalRevenue: 1,
                        rating: '$vendor.vendorProfile.rating',
                    },
                },
            ]),
            User_1.default.aggregate([
                { $match: { isVendor: true, 'vendorProfile.responseTime': { $exists: true } } },
                { $group: { _id: null, avg: { $avg: '$vendorProfile.responseTime' } } },
            ]),
            Review_1.default.aggregate([
                { $match: { reviewerType: 'client', isApproved: true, isHidden: false } },
                {
                    $group: {
                        _id: '$reviewee',
                        avgRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 },
                    },
                },
                { $sort: { avgRating: -1 } },
                { $limit: 10 },
            ]),
        ]);
        return {
            topVendors,
            avgResponseTime: avgResponseTime[0]?.avg || 0,
            topRated: vendorRatings,
        };
    }
    /**
     * Get service analytics
     */
    async getServiceAnalytics() {
        const [totalServices, servicesByCategory, topRatedServices, mostBookedServices,] = await Promise.all([
            Service_1.default.countDocuments({ isActive: true }),
            Service_1.default.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'category',
                    },
                },
                { $unwind: '$category' },
                {
                    $project: {
                        categoryName: '$category.name',
                        count: 1,
                    },
                },
            ]),
            Service_1.default.aggregate([
                { $match: { isActive: true, 'metadata.totalReviews': { $gt: 0 } } },
                { $sort: { 'metadata.averageRating': -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        rating: '$metadata.averageRating',
                        reviews: '$metadata.totalReviews',
                    },
                },
            ]),
            Service_1.default.aggregate([
                { $match: { isActive: true } },
                { $sort: { 'metadata.bookings': -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        bookings: '$metadata.bookings',
                        completedBookings: '$metadata.completedBookings',
                    },
                },
            ]),
        ]);
        return {
            totalServices,
            byCategory: servicesByCategory,
            topRated: topRatedServices,
            mostBooked: mostBookedServices,
        };
    }
    /**
     * Get dispute analytics
     */
    async getDisputeAnalytics() {
        const [totalDisputes, disputesByStatus, disputesByCategory, avgResolutionTime] = await Promise.all([
            Dispute_1.default.countDocuments(),
            Dispute_1.default.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Dispute_1.default.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
            ]),
            Dispute_1.default.aggregate([
                { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
                {
                    $project: {
                        resolutionTime: {
                            $subtract: ['$resolvedAt', '$createdAt'],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: '$resolutionTime' },
                    },
                },
            ]),
        ]);
        return {
            total: totalDisputes,
            byStatus: disputesByStatus,
            byCategory: disputesByCategory,
            avgResolutionTime: avgResolutionTime[0]?.avgTime
                ? (avgResolutionTime[0].avgTime / (1000 * 60 * 60)).toFixed(2) // hours
                : 0,
        };
    }
    /**
     * Get referral analytics
     */
    async getReferralAnalytics() {
        const [totalReferrals, completedReferrals, totalRewardsPaid, conversionRate,] = await Promise.all([
            Referral_1.default.countDocuments(),
            Referral_1.default.countDocuments({ status: 'completed' }),
            Referral_1.default.aggregate([
                { $match: { status: 'completed' } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $add: ['$referrerReward', '$refereeReward'] } },
                    },
                },
            ]),
            Referral_1.default.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        completed: {
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                        },
                    },
                },
            ]),
        ]);
        const rate = conversionRate[0]
            ? ((conversionRate[0].completed / conversionRate[0].total) * 100).toFixed(2)
            : 0;
        return {
            totalReferrals,
            completedReferrals,
            totalRewardsPaid: totalRewardsPaid[0]?.total || 0,
            conversionRate: rate,
        };
    }
    /**
     * Export analytics data
     */
    async exportAnalytics(type, filters) {
        let data;
        switch (type) {
            case 'users':
                data = await this.getUserAnalytics(filters);
                break;
            case 'bookings':
                data = await this.getBookingAnalytics(filters);
                break;
            case 'revenue':
                data = await this.getRevenueAnalytics(filters);
                break;
            case 'vendors':
                data = await this.getVendorPerformance();
                break;
            case 'services':
                data = await this.getServiceAnalytics();
                break;
            case 'disputes':
                data = await this.getDisputeAnalytics();
                break;
            case 'referrals':
                data = await this.getReferralAnalytics();
                break;
            default:
                throw new errors_1.NotFoundError('Invalid analytics type');
        }
        logger_1.default.info(`Analytics exported: ${type}`);
        return data;
    }
}
exports.default = new AnalyticsService();
//# sourceMappingURL=analytics.service.js.map