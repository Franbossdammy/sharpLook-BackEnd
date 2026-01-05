"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vendorAnalytics_service_1 = __importDefault(require("../services/vendorAnalytics.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class AnalyticsController {
    constructor() {
        /**
         * Get vendor analytics
         * GET /api/v1/analytics/vendor
         */
        this.getVendorAnalytics = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const startDate = req.query.startDate
                ? new Date(req.query.startDate)
                : undefined;
            const endDate = req.query.endDate
                ? new Date(req.query.endDate)
                : undefined;
            const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
            const analytics = await vendorAnalytics_service_1.default.getVendorAnalytics(vendorId, dateRange);
            return response_1.default.success(res, 'Vendor analytics retrieved successfully', analytics);
        });
        /**
         * Get quick stats for dashboard
         * GET /api/v1/analytics/vendor/quick-stats
         */
        this.getVendorQuickStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const stats = await vendorAnalytics_service_1.default.getVendorQuickStats(vendorId);
            return response_1.default.success(res, 'Quick stats retrieved successfully', stats);
        });
    }
}
exports.default = new AnalyticsController();
//# sourceMappingURL=vendorAnalytics.controller.js.map