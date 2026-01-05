"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Subscription_1 = __importDefault(require("../models/Subscription"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class SubscriptionService {
    /**
     * Calculate pricing based on subscription type
     */
    calculatePricing(type) {
        switch (type) {
            case 'in_shop':
                return { monthlyFee: 5000, commissionRate: 0 };
            case 'home_service':
                return { monthlyFee: 0, commissionRate: 10 };
            case 'both':
                return { monthlyFee: 0, commissionRate: 10 };
            default:
                return { monthlyFee: 0, commissionRate: 0 };
        }
    }
    /**
     * Create subscription
     */
    async createSubscription(vendorId, type) {
        const vendor = await User_1.default.findById(vendorId);
        if (!vendor || !vendor.isVendor) {
            throw new errors_1.BadRequestError('User must be a vendor');
        }
        const existingSubscription = await Subscription_1.default.findOne({
            vendor: vendorId,
            status: 'active',
        });
        if (existingSubscription) {
            throw new errors_1.BadRequestError('Vendor already has an active subscription');
        }
        const { monthlyFee, commissionRate } = this.calculatePricing(type);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        const nextPaymentDue = new Date(endDate);
        nextPaymentDue.setDate(nextPaymentDue.getDate() - 7);
        const subscription = await Subscription_1.default.create({
            vendor: vendorId,
            type,
            monthlyFee,
            commissionRate,
            status: monthlyFee > 0 ? 'pending' : 'active',
            startDate,
            endDate,
            nextPaymentDue,
            autoRenew: true,
        });
        if (monthlyFee === 0) {
            subscription.status = 'active';
            subscription.lastPaymentDate = new Date();
            await subscription.save();
        }
        logger_1.default.info(`Subscription created: ${subscription._id}`);
        return subscription;
    }
    async paySubscription(subscriptionId, paymentReference) {
        const subscription = await Subscription_1.default.findById(subscriptionId);
        if (!subscription) {
            throw new errors_1.NotFoundError('Subscription not found');
        }
        if (subscription.monthlyFee === 0) {
            throw new errors_1.BadRequestError('This subscription has no monthly fee');
        }
        const vendor = await User_1.default.findById(subscription.vendor);
        if (!vendor) {
            throw new errors_1.NotFoundError('Vendor not found');
        }
        if (vendor.walletBalance < subscription.monthlyFee) {
            throw new errors_1.BadRequestError(`Insufficient wallet balance. Your balance: ₦${vendor.walletBalance.toLocaleString()}, Required: ₦${subscription.monthlyFee.toLocaleString()}`);
        }
        const previousBalance = vendor.walletBalance;
        vendor.walletBalance -= subscription.monthlyFee;
        await vendor.save();
        await Transaction_1.default.create({
            user: vendor._id,
            type: types_1.TransactionType.SUBSCRIPTION_PAYMENT,
            amount: -subscription.monthlyFee,
            balanceBefore: previousBalance,
            balanceAfter: vendor.walletBalance,
            status: types_1.PaymentStatus.COMPLETED,
            reference: paymentReference || `SUB-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
            description: `Subscription payment for ${subscription.type}`,
        });
        subscription.status = 'active';
        subscription.lastPaymentDate = new Date();
        subscription.lastPaymentAmount = subscription.monthlyFee;
        subscription.lastPaymentReference = paymentReference;
        const newEndDate = new Date(subscription.endDate);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        subscription.endDate = newEndDate;
        const newNextPaymentDue = new Date(newEndDate);
        newNextPaymentDue.setDate(newNextPaymentDue.getDate() - 7);
        subscription.nextPaymentDue = newNextPaymentDue;
        await subscription.save();
        logger_1.default.info(`Subscription paid: ${subscription._id}`);
        return subscription;
    }
    /**
     * Get vendor subscription
     */
    async getVendorSubscription(vendorId) {
        return await Subscription_1.default.findOne({
            vendor: vendorId,
            status: { $in: ['active', 'pending'] },
        }).sort({ createdAt: -1 });
    }
    /**
     * Get commission rate
     */
    async getCommissionRate(vendorId) {
        const subscription = await this.getVendorSubscription(vendorId);
        if (!subscription || subscription.status !== 'active') {
            return 10;
        }
        return subscription.commissionRate;
    }
    /**
     * Update subscription type (alias for changeSubscriptionPlan)
     */
    async updateSubscriptionType(vendorId, newType) {
        const subscription = await this.getVendorSubscription(vendorId);
        if (!subscription) {
            throw new errors_1.NotFoundError('No active subscription found');
        }
        const { monthlyFee, commissionRate } = this.calculatePricing(newType);
        subscription.type = newType;
        subscription.monthlyFee = monthlyFee;
        subscription.commissionRate = commissionRate;
        if (monthlyFee > 0 && subscription.status === 'active' && !subscription.lastPaymentDate) {
            subscription.status = 'pending';
        }
        await subscription.save();
        logger_1.default.info(`Subscription updated: ${subscription._id}`);
        return subscription;
    }
    /**
     * Change subscription plan (same as updateSubscriptionType)
     */
    async changeSubscriptionPlan(vendorId, subscriptionId, newType) {
        // Verify the subscription belongs to the vendor
        const subscription = await Subscription_1.default.findOne({
            _id: subscriptionId,
            vendor: vendorId
        });
        if (!subscription) {
            throw new errors_1.NotFoundError('Subscription not found or does not belong to vendor');
        }
        const { monthlyFee, commissionRate } = this.calculatePricing(newType);
        subscription.type = newType;
        subscription.monthlyFee = monthlyFee;
        subscription.commissionRate = commissionRate;
        if (monthlyFee > 0 && subscription.status === 'active' && !subscription.lastPaymentDate) {
            subscription.status = 'pending';
        }
        await subscription.save();
        logger_1.default.info(`Subscription plan changed: ${subscription._id}`);
        return subscription;
    }
    /**
     * Cancel subscription
     */
    async cancelSubscription(vendorId, reason) {
        const subscription = await this.getVendorSubscription(vendorId);
        if (!subscription) {
            throw new errors_1.NotFoundError('No active subscription found');
        }
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = reason;
        subscription.autoRenew = false;
        await subscription.save();
        logger_1.default.info(`Subscription cancelled: ${subscription._id}`);
        return subscription;
    }
    /**
     * Get all subscriptions (admin)
     */
    async getAllSubscriptions(filters, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        // Build query
        const query = {};
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.type) {
            query.type = filters.type;
        }
        const [subscriptions, total] = await Promise.all([
            Subscription_1.default.find(query)
                .populate('vendor', 'firstName lastName email businessName')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Subscription_1.default.countDocuments(query),
        ]);
        return {
            subscriptions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get subscription statistics
     */
    async getSubscriptionStats() {
        // const now = new Date();
        const [totalSubscriptions, activeSubscriptions, pendingSubscriptions, cancelledSubscriptions, expiredSubscriptions, recentSubscriptions,] = await Promise.all([
            Subscription_1.default.countDocuments(),
            Subscription_1.default.countDocuments({ status: 'active' }),
            Subscription_1.default.countDocuments({ status: 'pending' }),
            Subscription_1.default.countDocuments({ status: 'cancelled' }),
            Subscription_1.default.countDocuments({ status: 'expired' }),
            Subscription_1.default.find()
                .populate('vendor', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(10),
        ]);
        // Calculate revenue by type
        const revenueByType = await Subscription_1.default.aggregate([
            {
                $match: { status: 'active' }
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    revenue: { $sum: '$monthlyFee' }
                }
            }
        ]);
        // Calculate total revenue
        const totalRevenue = revenueByType.reduce((sum, item) => sum + item.revenue, 0);
        return {
            totalSubscriptions,
            activeSubscriptions,
            pendingSubscriptions,
            cancelledSubscriptions,
            expiredSubscriptions,
            totalRevenue,
            revenueByType,
            recentSubscriptions,
        };
    }
}
exports.default = new SubscriptionService();
//# sourceMappingURL=subscription.service.js.map