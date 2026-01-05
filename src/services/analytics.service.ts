import User from '../models/User';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import Service from '../models/Service';
import Review from '../models/Review';
import Dispute from '../models/Dispute';
import Referral from '../models/Referral';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

class AnalyticsService {
  /**
   * Get dashboard overview
   */
  public async getDashboardOverview(): Promise<any> {
    const [
      totalUsers,
      totalVendors,
      activeVendors,
      totalBookings,
      completedBookings,
      totalRevenue,
      monthlyRevenue,
      activeBookings,
      totalServices,
      avgRating,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVendor: true }),
      User.countDocuments({ isVendor: true, 'vendorProfile.isVerified': true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Payment.aggregate([
        { $match: { status: 'released' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: 'released',
            createdAt: { $gte: new Date(new Date().setDate(1)) }, // This month
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Booking.countDocuments({ status: { $in: ['pending', 'accepted', 'in_progress'] } }),
      Service.countDocuments({ isActive: true }),
      Review.aggregate([
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
        completionRate:
          totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(2) : 0,
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
  public async getUserAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilter.createdAt = {};
      if (filters.startDate) dateFilter.createdAt.$gte = filters.startDate;
      if (filters.endDate) dateFilter.createdAt.$lte = filters.endDate;
    }

    const [totalUsers, usersByRole, usersByMonth, newUsersToday] = await Promise.all([
      User.countDocuments(dateFilter),
      User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $cond: ['$isVendor', 'vendor', 'client'] },
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
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
      User.countDocuments({
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
  public async getBookingAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilter.createdAt = {};
      if (filters.startDate) dateFilter.createdAt.$gte = filters.startDate;
      if (filters.endDate) dateFilter.createdAt.$lte = filters.endDate;
    }

    const [
      totalBookings,
      bookingsByStatus,
      bookingsByType,
      bookingsByMonth,
      avgBookingValue,
      topServices,
    ] = await Promise.all([
      Booking.countDocuments(dateFilter),
      Booking.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$bookingType', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
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
      Booking.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
      ]),
      Booking.aggregate([
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
  public async getRevenueAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilter.createdAt = {};
      if (filters.startDate) dateFilter.createdAt.$gte = filters.startDate;
      if (filters.endDate) dateFilter.createdAt.$lte = filters.endDate;
    }

    const [
      totalRevenue,
      revenueByMonth,
      platformFees,
      avgTransactionValue,
      paymentMethods,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { ...dateFilter, status: 'released' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
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
      Payment.aggregate([
        { $match: { ...dateFilter, status: 'released' } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
      Payment.aggregate([
        { $match: { ...dateFilter, status: { $in: ['completed', 'released'] } } },
        { $group: { _id: null, avg: { $avg: '$amount' } } },
      ]),
      Payment.aggregate([
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
  public async getVendorPerformance(vendorId?: string): Promise<any> {
    const matchFilter = vendorId ? { vendor: vendorId as any } : {};

    const [
      topVendors,
      avgResponseTime,
      vendorRatings,
    ] = await Promise.all([
      Booking.aggregate([
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
      User.aggregate([
        { $match: { isVendor: true, 'vendorProfile.responseTime': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$vendorProfile.responseTime' } } },
      ]),
      Review.aggregate([
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
  public async getServiceAnalytics(): Promise<any> {
    const [
      totalServices,
      servicesByCategory,
      topRatedServices,
      mostBookedServices,
    ] = await Promise.all([
      Service.countDocuments({ isActive: true }),
      Service.aggregate([
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
      Service.aggregate([
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
      Service.aggregate([
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
  public async getDisputeAnalytics(): Promise<any> {
    const [totalDisputes, disputesByStatus, disputesByCategory, avgResolutionTime] =
      await Promise.all([
        Dispute.countDocuments(),
        Dispute.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Dispute.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
        Dispute.aggregate([
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
  public async getReferralAnalytics(): Promise<any> {
    const [
      totalReferrals,
      completedReferrals,
      totalRewardsPaid,
      conversionRate,
    ] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ status: 'completed' }),
      Referral.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            total: { $sum: { $add: ['$referrerReward', '$refereeReward'] } },
          },
        },
      ]),
      Referral.aggregate([
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
  public async exportAnalytics(type: string, filters?: any): Promise<any> {
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
        throw new NotFoundError('Invalid analytics type');
    }

    logger.info(`Analytics exported: ${type}`);

    return data;
  }
}

export default new AnalyticsService();
