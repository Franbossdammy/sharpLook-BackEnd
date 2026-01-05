interface DateRange {
    startDate: Date;
    endDate: Date;
}
interface VendorAnalytics {
    overview: {
        totalRevenue: number;
        totalOrders: number;
        totalBookings: number;
        totalProducts: number;
        totalServices: number;
        averageRating: number;
        totalReviews: number;
        completedBookings: number;
        completedOrders: number;
        pendingOrders: number;
        pendingBookings: number;
        activeProducts: number;
        activeServices: number;
    };
    revenue: {
        total: number;
        fromBookings: number;
        fromOrders: number;
        pending: number;
        inEscrow: number;
        released: number;
        byPeriod: Array<{
            date: string;
            revenue: number;
            bookings: number;
            orders: number;
        }>;
    };
    bookings: {
        total: number;
        completed: number;
        pending: number;
        accepted: number;
        inProgress: number;
        cancelled: number;
        rejected: number;
        completionRate: number;
        cancellationRate: number;
        byStatus: Array<{
            status: string;
            count: number;
            percentage: number;
        }>;
        byPeriod: Array<{
            date: string;
            count: number;
        }>;
        topServices: Array<{
            service: any;
            bookings: number;
            revenue: number;
        }>;
    };
    orders: {
        total: number;
        completed: number;
        pending: number;
        processing: number;
        shipped: number;
        delivered: number;
        cancelled: number;
        completionRate: number;
        cancellationRate: number;
        averageOrderValue: number;
        byStatus: Array<{
            status: string;
            count: number;
            percentage: number;
        }>;
        byPeriod: Array<{
            date: string;
            count: number;
            revenue: number;
        }>;
        topProducts: Array<{
            product: any;
            orders: number;
            revenue: number;
            quantity: number;
        }>;
    };
    products: {
        total: number;
        active: number;
        outOfStock: number;
        lowStock: number;
        approved: number;
        pending: number;
        rejected: number;
        totalViews: number;
        totalOrders: number;
        conversionRate: number;
        topPerforming: Array<{
            product: any;
            views: number;
            orders: number;
            revenue: number;
            rating: number;
        }>;
    };
    services: {
        total: number;
        active: number;
        approved: number;
        pending: number;
        rejected: number;
        totalViews: number;
        totalBookings: number;
        conversionRate: number;
        topPerforming: Array<{
            service: any;
            views: number;
            bookings: number;
            revenue: number;
            rating: number;
        }>;
    };
    reviews: {
        total: number;
        averageRating: number;
        distribution: {
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
        };
        recent: Array<any>;
        positivePercentage: number;
        negativePercentage: number;
    };
    customers: {
        total: number;
        returning: number;
        new: number;
        returningRate: number;
        topCustomers: Array<{
            customer: any;
            totalSpent: number;
            orders: number;
            bookings: number;
            lastPurchase: Date;
        }>;
    };
    performance: {
        responseTime: number;
        acceptanceRate: number;
        completionRate: number;
        cancellationRate: number;
        onTimeDeliveryRate: number;
        customerSatisfactionScore: number;
    };
}
declare class AnalyticsService {
    /**
     * Get comprehensive vendor analytics
     */
    getVendorAnalytics(vendorId: string, dateRange?: DateRange): Promise<VendorAnalytics>;
    /**
     * Get bookings analytics
     */
    private getBookingsAnalytics;
    /**
     * Get orders analytics
     */
    private getOrdersAnalytics;
    /**
     * Get products analytics
     */
    private getProductsAnalytics;
    /**
     * Get services analytics
     */
    private getServicesAnalytics;
    /**
     * Get reviews analytics
     */
    private getReviewsAnalytics;
    /**
     * Get payments/revenue analytics
     */
    private getPaymentsAnalytics;
    /**
     * Get customer analytics
     */
    private getCustomerAnalytics;
    /**
     * Calculate average response time
     */
    private calculateAverageResponseTime;
    /**
     * Calculate on-time delivery rate
     */
    private calculateOnTimeDeliveryRate;
    /**
     * Calculate satisfaction score from rating
     */
    private calculateSatisfactionScore;
    /**
     * Calculate rate/percentage
     */
    private calculateRate;
    /**
     * Group data by period (daily)
     */
    private groupByPeriod;
    /**
     * Group revenue by period
     */
    private groupRevenueByPeriod;
    /**
     * Get quick stats for dashboard
     */
    getVendorQuickStats(vendorId: string): Promise<any>;
}
declare const _default: AnalyticsService;
export default _default;
//# sourceMappingURL=vendorAnalytics.service.d.ts.map