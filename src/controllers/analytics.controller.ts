import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import analyticsService from '../services/analytics.service';
import auditLogService from '../services/auditLog.service';
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

  public getAcquisitionAnalytics = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const data = await analyticsService.getAcquisitionAnalytics(filters);
      return ResponseHandler.success(res, 'Acquisition analytics retrieved', { data });
    }
  );

  public getUserDetails = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        role: req.query.role as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      };
      const data = await analyticsService.getUserDetails(filters);

      // Audit log: accessing user PII data
      if (req.user) {
        auditLogService.log({
          action: 'VIEW_USER_DETAILS',
          resource: 'analytics',
          actor: req.user.id,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          details: `${req.user.email}: Viewed user details analytics (page ${filters.page}, filters: role=${filters.role || 'all'}, status=${filters.status || 'all'}, search=${filters.search || 'none'})`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(() => {});
      }

      return ResponseHandler.success(res, 'User details retrieved', { data });
    }
  );

  public exportUserData = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        role: req.query.role as string | undefined,
        status: req.query.status as string | undefined,
      };
      const format = (req.query.format as string) || 'json';
      const users = await analyticsService.exportUserData(filters);

      // Audit log: exporting user data (sensitive operation)
      if (req.user) {
        auditLogService.log({
          action: 'EXPORT_USER_DATA',
          resource: 'analytics',
          actor: req.user.id,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          details: `${req.user.email}: Exported ${users.length} user records as ${format.toUpperCase()} (filters: role=${filters.role || 'all'}, status=${filters.status || 'all'})`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(() => {});
      }

      if (format === 'csv') {
        const csvHeader = 'First Name,Last Name,Email,Phone,Role,Status,Is Vendor,Vendor Verified,Business Name,City,State,Email Verified,Phone Verified,Joined Date,Last Login\n';
        const csvRows = users.map((u: any) =>
          [
            u.firstName || '',
            u.lastName || '',
            u.email || '',
            u.phone || '',
            u.role || '',
            u.status || '',
            u.isVendor ? 'Yes' : 'No',
            u.vendorProfile?.isVerified ? 'Yes' : 'No',
            u.vendorProfile?.businessName || '',
            u.location?.city || '',
            u.location?.state || '',
            u.isEmailVerified ? 'Yes' : 'No',
            u.isPhoneVerified ? 'Yes' : 'No',
            u.createdAt ? new Date(u.createdAt).toISOString() : '',
            u.lastLogin ? new Date(u.lastLogin).toISOString() : 'Never',
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csvHeader + csvRows);
      }

      return ResponseHandler.success(res, 'User data exported', { data: users });
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
