"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = __importDefault(require("../controllers/analytics.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const analytics_validation_1 = require("../validations/analytics.validation");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, auth_1.requireAdmin);
/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard overview
 * @access  Private (Admin)
 */
router.get('/dashboard', analytics_controller_1.default.getDashboardOverview);
/**
 * @route   GET /api/v1/analytics/users
 * @desc    Get user analytics
 * @access  Private (Admin)
 */
router.get('/users', (0, validate_1.validate)(analytics_validation_1.dateRangeValidation), analytics_controller_1.default.getUserAnalytics);
/**
 * @route   GET /api/v1/analytics/bookings
 * @desc    Get booking analytics
 * @access  Private (Admin)
 */
router.get('/bookings', (0, validate_1.validate)(analytics_validation_1.dateRangeValidation), analytics_controller_1.default.getBookingAnalytics);
/**
 * @route   GET /api/v1/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private (Admin)
 */
router.get('/revenue', (0, validate_1.validate)(analytics_validation_1.dateRangeValidation), analytics_controller_1.default.getRevenueAnalytics);
/**
 * @route   GET /api/v1/analytics/vendors
 * @desc    Get vendor performance
 * @access  Private (Admin)
 */
router.get('/vendors', (0, validate_1.validate)(analytics_validation_1.vendorIdQueryValidation), analytics_controller_1.default.getVendorPerformance);
/**
 * @route   GET /api/v1/analytics/services
 * @desc    Get service analytics
 * @access  Private (Admin)
 */
router.get('/services', analytics_controller_1.default.getServiceAnalytics);
/**
 * @route   GET /api/v1/analytics/disputes
 * @desc    Get dispute analytics
 * @access  Private (Admin)
 */
router.get('/disputes', analytics_controller_1.default.getDisputeAnalytics);
/**
 * @route   GET /api/v1/analytics/referrals
 * @desc    Get referral analytics
 * @access  Private (Admin)
 */
router.get('/referrals', analytics_controller_1.default.getReferralAnalytics);
/**
 * @route   GET /api/v1/analytics/export/:type
 * @desc    Export analytics data
 * @access  Private (Admin)
 */
router.get('/export/:type', (0, validate_1.validate)([...analytics_validation_1.exportTypeValidation, ...analytics_validation_1.dateRangeValidation]), analytics_controller_1.default.exportAnalytics);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map