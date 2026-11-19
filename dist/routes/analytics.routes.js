"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
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
 * @route   GET /api/v1/analytics/acquisition
 * @desc    Get "How did you hear about us" analytics
 * @access  Private (Admin)
 */
router.get('/acquisition', (0, validate_1.validate)(analytics_validation_1.dateRangeValidation), analytics_controller_1.default.getAcquisitionAnalytics);
/**
 * @route   GET /api/v1/analytics/users/details
 * @desc    Get detailed user list for analytics (email, phone, role, status, dates)
 * @access  Private (Admin / Analytics Admin)
 */
router.get('/users/details', (0, validate_1.validate)(analytics_validation_1.dateRangeValidation), analytics_controller_1.default.getUserDetails);
/**
 * @route   GET /api/v1/analytics/users/export
 * @desc    Export user data as CSV or JSON
 * @access  Private (Admin / Analytics Admin)
 */
router.get('/users/export', (0, validate_1.validate)(analytics_validation_1.dateRangeValidation), analytics_controller_1.default.exportUserData);
/**
 * @route   GET /api/v1/analytics/export/:type
 * @desc    Export analytics data
 * @access  Private (Admin)
 */
router.get('/export/:type', (0, validate_1.validate)([...analytics_validation_1.exportTypeValidation, ...analytics_validation_1.dateRangeValidation]), analytics_controller_1.default.exportAnalytics);
/**
 * @route   GET /api/v1/analytics/activity
 * @desc    Who is active / gone quiet (vendors or clients), with list + CSV export
 * @access  Private (Admin)
 */
router.get('/activity', (0, validate_1.validate)([
    (0, express_validator_1.query)('role').optional().isIn(['vendor', 'client']).withMessage('role must be vendor or client'),
    (0, express_validator_1.query)('bucket').optional({ checkFalsy: true }).isIn(['active7', 'd7to30', 'd30to90', 'over90', 'never']),
    (0, express_validator_1.query)('kyc').optional({ checkFalsy: true }).isIn(['approved', 'pending', 'rejected', 'not_submitted']),
    (0, express_validator_1.query)('sort').optional({ checkFalsy: true }).isIn(['recent', 'oldest']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 5000 }),
    (0, express_validator_1.query)('search').optional().isString().isLength({ max: 100 }),
    (0, express_validator_1.query)('format').optional({ checkFalsy: true }).isIn(['csv']),
]), analytics_controller_1.default.getActivity);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map