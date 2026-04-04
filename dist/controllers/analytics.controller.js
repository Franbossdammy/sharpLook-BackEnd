"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_service_1 = __importDefault(require("../services/analytics.service"));
const auditLog_service_1 = __importDefault(require("../services/auditLog.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class AnalyticsController {
    constructor() {
        this.getDashboardOverview = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const data = await analytics_service_1.default.getDashboardOverview();
            return response_1.default.success(res, 'Dashboard data retrieved', { data });
        });
        this.getUserAnalytics = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const data = await analytics_service_1.default.getUserAnalytics(filters);
            return response_1.default.success(res, 'User analytics retrieved', { data });
        });
        this.getBookingAnalytics = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const data = await analytics_service_1.default.getBookingAnalytics(filters);
            return response_1.default.success(res, 'Booking analytics retrieved', { data });
        });
        this.getRevenueAnalytics = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const data = await analytics_service_1.default.getRevenueAnalytics(filters);
            return response_1.default.success(res, 'Revenue analytics retrieved', { data });
        });
        this.getVendorPerformance = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { vendorId } = req.query;
            const data = await analytics_service_1.default.getVendorPerformance(vendorId);
            return response_1.default.success(res, 'Vendor performance retrieved', { data });
        });
        this.getServiceAnalytics = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const data = await analytics_service_1.default.getServiceAnalytics();
            return response_1.default.success(res, 'Service analytics retrieved', { data });
        });
        this.getDisputeAnalytics = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const data = await analytics_service_1.default.getDisputeAnalytics();
            return response_1.default.success(res, 'Dispute analytics retrieved', { data });
        });
        this.getReferralAnalytics = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const data = await analytics_service_1.default.getReferralAnalytics();
            return response_1.default.success(res, 'Referral analytics retrieved', { data });
        });
        this.getAcquisitionAnalytics = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const data = await analytics_service_1.default.getAcquisitionAnalytics(filters);
            return response_1.default.success(res, 'Acquisition analytics retrieved', { data });
        });
        this.getUserDetails = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 50,
                role: req.query.role,
                status: req.query.status,
                search: req.query.search,
            };
            const data = await analytics_service_1.default.getUserDetails(filters);
            // Audit log: accessing user PII data
            if (req.user) {
                auditLog_service_1.default.log({
                    action: 'VIEW_USER_DETAILS',
                    resource: 'analytics',
                    actor: req.user.id,
                    actorEmail: req.user.email,
                    actorRole: req.user.role,
                    details: `${req.user.email}: Viewed user details analytics (page ${filters.page}, filters: role=${filters.role || 'all'}, status=${filters.status || 'all'}, search=${filters.search || 'none'})`,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                }).catch(() => { });
            }
            return response_1.default.success(res, 'User details retrieved', { data });
        });
        this.exportUserData = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                role: req.query.role,
                status: req.query.status,
            };
            const format = req.query.format || 'json';
            const users = await analytics_service_1.default.exportUserData(filters);
            // Audit log: exporting user data (sensitive operation)
            if (req.user) {
                auditLog_service_1.default.log({
                    action: 'EXPORT_USER_DATA',
                    resource: 'analytics',
                    actor: req.user.id,
                    actorEmail: req.user.email,
                    actorRole: req.user.role,
                    details: `${req.user.email}: Exported ${users.length} user records as ${format.toUpperCase()} (filters: role=${filters.role || 'all'}, status=${filters.status || 'all'})`,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                }).catch(() => { });
            }
            if (format === 'csv') {
                const csvHeader = 'First Name,Last Name,Email,Phone,Role,Status,Is Vendor,Vendor Verified,Business Name,City,State,Email Verified,Phone Verified,Joined Date,Last Login\n';
                const csvRows = users.map((u) => [
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
                ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
                return res.send(csvHeader + csvRows);
            }
            return response_1.default.success(res, 'User data exported', { data: users });
        });
        this.exportAnalytics = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { type } = req.params;
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const data = await analytics_service_1.default.exportAnalytics(type, filters);
            return response_1.default.success(res, 'Analytics exported', { data });
        });
    }
}
exports.default = new AnalyticsController();
//# sourceMappingURL=analytics.controller.js.map