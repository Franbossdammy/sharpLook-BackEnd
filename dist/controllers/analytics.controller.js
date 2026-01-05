"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_service_1 = __importDefault(require("../services/analytics.service"));
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