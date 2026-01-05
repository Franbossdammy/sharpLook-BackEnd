import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import analyticsService from '../services/analytics.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class AnalyticsController {
  public getDashboardOverview = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const data = await analyticsService.getDashboardOverview();
      return ResponseHandler.success(res, 'Dashboard data retrieved', { data });
    }
  );

  public getUserAnalytics = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const data = await analyticsService.getUserAnalytics(filters);
      return ResponseHandler.success(res, 'User analytics retrieved', { data });
    }
  );

  public getBookingAnalytics = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const data = await analyticsService.getBookingAnalytics(filters);
      return ResponseHandler.success(res, 'Booking analytics retrieved', { data });
    }
  );

  public getRevenueAnalytics = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const data = await analyticsService.getRevenueAnalytics(filters);
      return ResponseHandler.success(res, 'Revenue analytics retrieved', { data });
    }
  );

  public getVendorPerformance = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { vendorId } = req.query;
      const data = await analyticsService.getVendorPerformance(vendorId as string);
      return ResponseHandler.success(res, 'Vendor performance retrieved', { data });
    }
  );

  public getServiceAnalytics = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const data = await analyticsService.getServiceAnalytics();
      return ResponseHandler.success(res, 'Service analytics retrieved', { data });
    }
  );

  public getDisputeAnalytics = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const data = await analyticsService.getDisputeAnalytics();
      return ResponseHandler.success(res, 'Dispute analytics retrieved', { data });
    }
  );

  public getReferralAnalytics = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const data = await analyticsService.getReferralAnalytics();
      return ResponseHandler.success(res, 'Referral analytics retrieved', { data });
    }
  );

  public exportAnalytics = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { type } = req.params;
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const data = await analyticsService.exportAnalytics(type, filters);
      return ResponseHandler.success(res, 'Analytics exported', { data });
    }
  );
}

export default new AnalyticsController();
