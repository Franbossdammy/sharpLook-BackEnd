declare class AnalyticsService {
    /**
     * Get dashboard overview
     */
    getDashboardOverview(): Promise<any>;
    /**
     * Get user analytics
     */
    getUserAnalytics(filters?: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<any>;
    /**
     * Get booking analytics
     */
    getBookingAnalytics(filters?: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<any>;
    /**
     * Get revenue analytics
     */
    getRevenueAnalytics(filters?: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<any>;
    /**
     * Get vendor performance
     */
    getVendorPerformance(vendorId?: string): Promise<any>;
    /**
     * Get service analytics
     */
    getServiceAnalytics(): Promise<any>;
    /**
     * Get dispute analytics
     */
    getDisputeAnalytics(): Promise<any>;
    /**
     * Get referral analytics
     */
    getReferralAnalytics(): Promise<any>;
    /**
     * Export analytics data
     */
    exportAnalytics(type: string, filters?: any): Promise<any>;
}
declare const _default: AnalyticsService;
export default _default;
//# sourceMappingURL=analytics.service.d.ts.map