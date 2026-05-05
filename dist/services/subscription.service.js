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
const Subscription_1 = __importDefault(require("../models/Subscription"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const paystackHelper_1 = __importDefault(require("../utils/paystackHelper"));
class SubscriptionService {
    /**
     * Calculate pricing based on subscription type
     */
    calculatePricing(type) {
        // Commission temporarily disabled — all rates set to 0 until further notice
        switch (type) {
            case 'in_shop':
                return { monthlyFee: 5000, commissionRate: 0 };
            case 'home_service':
                return { monthlyFee: 0, commissionRate: 0 };
            case 'both':
                return { monthlyFee: 5000, commissionRate: 0 };
            default:
                return { monthlyFee: 0, commissionRate: 0 };
        }
    }
    /**
     * Create subscription
     */
    async createSubscription(vendorId, type, plan = 'free' // tier defaults to free
    ) {
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
            plan,
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
     * Get vendor posting limits based on plan tier
     */
    async getVendorPostingLimits(vendorId) {
        const subscription = await this.getVendorSubscription(vendorId);
        const plan = subscription?.plan || 'free';
        const PLAN_LIMITS = {
            free: { services: 2, products: 2 },
            pro: { services: 5, products: 5 },
            premium: { services: Infinity, products: Infinity },
        };
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
        // Dynamic import to avoid circular deps
        const Service = (await Promise.resolve().then(() => __importStar(require('../models/Service')))).default;
        const Product = (await Promise.resolve().then(() => __importStar(require('../models/Product')))).default;
        const [servicesUsed, productsUsed] = await Promise.all([
            Service.countDocuments({ vendor: vendorId, isDeleted: { $ne: true } }),
            Product.countDocuments({ seller: vendorId, isDeleted: { $ne: true } }),
        ]);
        return {
            plan,
            serviceLimit: limits.services,
            productLimit: limits.products,
            servicesUsed,
            productsUsed,
        };
    }
    /**
     * Upgrade vendor tier (free/pro/premium) - separate from subscription type
     * For paid tiers, initializes Paystack payment and returns authorizationUrl.
     * For free tier, switches immediately.
     */
    async upgradeTier(vendorId, newTier) {
        const vendor = await User_1.default.findById(vendorId);
        if (!vendor || !vendor.isVendor) {
            throw new errors_1.BadRequestError('User must be a vendor');
        }
        const TIER_PRICES = {
            free: 0,
            pro: 2000,
            premium: 8000,
        };
        const price = TIER_PRICES[newTier] || 0;
        // Get or create subscription
        let subscription = await this.getVendorSubscription(vendorId);
        if (!subscription) {
            subscription = await this.createSubscription(vendorId, vendor.vendorProfile?.vendorType || 'home_service', 'free');
        }
        if (subscription.plan === newTier) {
            throw new errors_1.BadRequestError(`You are already on the ${newTier} plan`);
        }
        // Free tier — switch immediately
        if (price === 0) {
            subscription.plan = newTier;
            await subscription.save();
            logger_1.default.info(`Vendor ${vendorId} switched to ${newTier} tier`);
            return { subscription };
        }
        // Paid tier — initialize Paystack payment
        // paystackHelper.initializePayment already converts to kobo internally
        const reference = `TIER-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        const paymentData = await paystackHelper_1.default.initializePayment(vendor.email, price, reference, {
            vendorId,
            tier: newTier,
            type: 'tier_upgrade',
        });
        const authorizationUrl = paymentData.authorization_url;
        logger_1.default.info(`Tier upgrade payment initialized for vendor ${vendorId}: ${reference}`);
        return { subscription, authorizationUrl, reference };
    }
    /**
     * Verify and complete tier upgrade after Paystack payment
     */
    async completeTierUpgrade(reference) {
        const paymentData = await paystackHelper_1.default.verifyPayment(reference);
        if (paymentData.status !== 'success') {
            throw new errors_1.BadRequestError('Payment was not successful');
        }
        const metadata = paymentData.metadata;
        if (!metadata?.vendorId || !metadata?.tier) {
            throw new errors_1.BadRequestError('Invalid payment metadata');
        }
        const subscription = await this.getVendorSubscription(metadata.vendorId);
        if (!subscription) {
            throw new errors_1.NotFoundError('Subscription not found');
        }
        subscription.plan = metadata.tier;
        await subscription.save();
        // Record transaction
        const vendor = await User_1.default.findById(metadata.vendorId);
        if (vendor) {
            await Transaction_1.default.create({
                user: vendor._id,
                type: types_1.TransactionType.SUBSCRIPTION_PAYMENT,
                amount: -(paymentData.amount / 100),
                balanceBefore: vendor.walletBalance,
                balanceAfter: vendor.walletBalance,
                status: types_1.PaymentStatus.COMPLETED,
                reference,
                description: `Tier upgrade to ${metadata.tier}`,
            });
        }
        logger_1.default.info(`Vendor ${metadata.vendorId} upgraded to ${metadata.tier} tier via Paystack`);
        return subscription;
    }
    /**
     * Get commission rate
     */
    async getCommissionRate(_vendorId) {
        // Commission temporarily disabled — always 0% until further notice
        return 0;
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