import { ISubscription } from '../models/Subscription';
declare class SubscriptionService {
    /**
     * Calculate pricing based on subscription type
     */
    private calculatePricing;
    /**
     * Create subscription
     */
    createSubscription(vendorId: string, type: 'in_shop' | 'home_service' | 'both'): Promise<ISubscription>;
    paySubscription(subscriptionId: string, paymentReference: string): Promise<ISubscription>;
    /**
     * Get vendor subscription
     */
    getVendorSubscription(vendorId: string): Promise<ISubscription | null>;
    /**
     * Get commission rate
     */
    getCommissionRate(vendorId: string): Promise<number>;
    /**
     * Update subscription type (alias for changeSubscriptionPlan)
     */
    updateSubscriptionType(vendorId: string, newType: 'in_shop' | 'home_service' | 'both'): Promise<ISubscription>;
    /**
     * Change subscription plan (same as updateSubscriptionType)
     */
    changeSubscriptionPlan(vendorId: string, subscriptionId: string, newType: 'in_shop' | 'home_service' | 'both'): Promise<ISubscription>;
    /**
     * Cancel subscription
     */
    cancelSubscription(vendorId: string, reason?: string): Promise<ISubscription>;
    /**
     * Get all subscriptions (admin)
     */
    getAllSubscriptions(filters?: {
        status?: string;
        type?: string;
        search?: string;
    }, page?: number, limit?: number): Promise<{
        subscriptions: ISubscription[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get subscription statistics
     */
    getSubscriptionStats(): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
        pendingSubscriptions: number;
        cancelledSubscriptions: number;
        expiredSubscriptions: number;
        totalRevenue: number;
        revenueByType: any[];
        recentSubscriptions: ISubscription[];
    }>;
}
declare const _default: SubscriptionService;
export default _default;
//# sourceMappingURL=subscription.service.d.ts.map