import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import analyticsService from '../services/vendorAnalytics.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class AnalyticsController {
  /**
   * Get vendor analytics
   * GET /api/v1/analytics/vendor
   */
  public getVendorAnalytics = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : undefined;
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : undefined;

      const dateRange = startDate && endDate ? { startDate, endDate } : undefined;

      const analytics = await analyticsService.getVendorAnalytics(vendorId, dateRange);

      return ResponseHandler.success(
        res,
        'Vendor analytics retrieved successfully',
        analytics
      );
    }
  );

  /**
   * Get quick stats for dashboard
   * GET /api/v1/analytics/vendor/quick-stats
   */
  public getVendorQuickStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;

      const stats = await analyticsService.getVendorQuickStats(vendorId);

      return ResponseHandler.success(
        res,
        'Quick stats retrieved successfully',
        stats
      );
    }
  );
}

export default new AnalyticsController();