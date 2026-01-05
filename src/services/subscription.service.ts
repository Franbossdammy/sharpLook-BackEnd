import Subscription, { ISubscription } from '../models/Subscription';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { TransactionType, PaymentStatus } from '../types';
import { generateRandomString } from '../utils/helpers';
import logger from '../utils/logger';

class SubscriptionService {
  /**
   * Calculate pricing based on subscription type
   */
  private calculatePricing(
    type: 'in_shop' | 'home_service' | 'both'
  ): { monthlyFee: number; commissionRate: number } {
    switch (type) {
      case 'in_shop':
        return { monthlyFee: 5000, commissionRate: 0 };
      case 'home_service':
        return { monthlyFee: 0, commissionRate: 10 };
      case 'both':
        return { monthlyFee: 5000, commissionRate: 10 };
      default:
        return { monthlyFee: 0, commissionRate: 0 };
    }
  }

  /**
   * Create subscription
   */
  public async createSubscription(
    vendorId: string,
    type: 'in_shop' | 'home_service' | 'both'
  ): Promise<ISubscription> {
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.isVendor) {
      throw new BadRequestError('User must be a vendor');
    }

    const existingSubscription = await Subscription.findOne({
      vendor: vendorId,
      status: 'active',
    });

    if (existingSubscription) {
      throw new BadRequestError('Vendor already has an active subscription');
    }

    const { monthlyFee, commissionRate } = this.calculatePricing(type);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const nextPaymentDue = new Date(endDate);
    nextPaymentDue.setDate(nextPaymentDue.getDate() - 7);

    const subscription = await Subscription.create({
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

    logger.info(`Subscription created: ${subscription._id}`);
    return subscription;
  }

public async paySubscription(
  subscriptionId: string,
  paymentReference: string
): Promise<ISubscription> {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }

  if (subscription.monthlyFee === 0) {
    throw new BadRequestError('This subscription has no monthly fee');
  }

  const vendor = await User.findById(subscription.vendor);
  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  if (vendor.walletBalance < subscription.monthlyFee) {
    throw new BadRequestError(
      `Insufficient wallet balance. Your balance: ₦${vendor.walletBalance.toLocaleString()}, Required: ₦${subscription.monthlyFee.toLocaleString()}`
    );
  }

  const previousBalance = vendor.walletBalance;
  vendor.walletBalance -= subscription.monthlyFee;
  await vendor.save();

  await Transaction.create({
    user: vendor._id,
    type: TransactionType.SUBSCRIPTION_PAYMENT,
    amount: -subscription.monthlyFee,
    balanceBefore: previousBalance,
    balanceAfter: vendor.walletBalance,
    status: PaymentStatus.COMPLETED,
    reference: paymentReference || `SUB-${Date.now()}-${generateRandomString(8)}`,
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

  logger.info(`Subscription paid: ${subscription._id}`);
  return subscription;
}

  /**
   * Get vendor subscription
   */
  public async getVendorSubscription(vendorId: string): Promise<ISubscription | null> {
    return await Subscription.findOne({
      vendor: vendorId,
      status: { $in: ['active', 'pending'] },
    }).sort({ createdAt: -1 });
  }

  /**
   * Get commission rate
   */
  public async getCommissionRate(vendorId: string): Promise<number> {
    const subscription = await this.getVendorSubscription(vendorId);
    
    if (!subscription || subscription.status !== 'active') {
      return 10;
    }

    return subscription.commissionRate;
  }

  /**
   * Update subscription type (alias for changeSubscriptionPlan)
   */
  public async updateSubscriptionType(
    vendorId: string,
    newType: 'in_shop' | 'home_service' | 'both'
  ): Promise<ISubscription> {
    const subscription = await this.getVendorSubscription(vendorId);
    if (!subscription) {
      throw new NotFoundError('No active subscription found');
    }

    const { monthlyFee, commissionRate } = this.calculatePricing(newType);

    subscription.type = newType;
    subscription.monthlyFee = monthlyFee;
    subscription.commissionRate = commissionRate;

    if (monthlyFee > 0 && subscription.status === 'active' && !subscription.lastPaymentDate) {
      subscription.status = 'pending';
    }

    await subscription.save();

    logger.info(`Subscription updated: ${subscription._id}`);
    return subscription;
  }

  /**
   * Change subscription plan (same as updateSubscriptionType)
   */
  public async changeSubscriptionPlan(
    vendorId: string,
    subscriptionId: string,
    newType: 'in_shop' | 'home_service' | 'both'
  ): Promise<ISubscription> {
    // Verify the subscription belongs to the vendor
    const subscription = await Subscription.findOne({ 
      _id: subscriptionId, 
      vendor: vendorId 
    });
    
    if (!subscription) {
      throw new NotFoundError('Subscription not found or does not belong to vendor');
    }

    const { monthlyFee, commissionRate } = this.calculatePricing(newType);

    subscription.type = newType;
    subscription.monthlyFee = monthlyFee;
    subscription.commissionRate = commissionRate;

    if (monthlyFee > 0 && subscription.status === 'active' && !subscription.lastPaymentDate) {
      subscription.status = 'pending';
    }

    await subscription.save();

    logger.info(`Subscription plan changed: ${subscription._id}`);
    return subscription;
  }

  /**
   * Cancel subscription
   */
  public async cancelSubscription(
    vendorId: string,
    reason?: string
  ): Promise<ISubscription> {
    const subscription = await this.getVendorSubscription(vendorId);
    if (!subscription) {
      throw new NotFoundError('No active subscription found');
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;
    subscription.autoRenew = false;

    await subscription.save();

    logger.info(`Subscription cancelled: ${subscription._id}`);
    return subscription;
  }

  /**
   * Get all subscriptions (admin)
   */
  public async getAllSubscriptions(
    filters?: {
      status?: string;
      type?: string;
      search?: string;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ 
    subscriptions: ISubscription[]; 
    total: number; 
    page: number; 
    totalPages: number 
  }> {
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('vendor', 'firstName lastName email businessName')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Subscription.countDocuments(query),
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
  public async getSubscriptionStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    pendingSubscriptions: number;
    cancelledSubscriptions: number;
    expiredSubscriptions: number;
    totalRevenue: number;
    revenueByType: any[];
    recentSubscriptions: ISubscription[];
  }> {
    // const now = new Date();

    const [
      totalSubscriptions,
      activeSubscriptions,
      pendingSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      recentSubscriptions,
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'pending' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.find()
        .populate('vendor', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    // Calculate revenue by type
    const revenueByType = await Subscription.aggregate([
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

export default new SubscriptionService();