import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  dateRangeValidation,
  vendorIdQueryValidation,
  exportTypeValidation,
} from '../validations/analytics.validation';

const router = Router();

router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard overview
 * @access  Private (Admin)
 */
router.get('/dashboard', analyticsController.getDashboardOverview);

/**
 * @route   GET /api/v1/analytics/users
 * @desc    Get user analytics
 * @access  Private (Admin)
 */
router.get('/users', validate(dateRangeValidation), analyticsController.getUserAnalytics);

/**
 * @route   GET /api/v1/analytics/bookings
 * @desc    Get booking analytics
 * @access  Private (Admin)
 */
router.get(
  '/bookings',
  validate(dateRangeValidation),
  analyticsController.getBookingAnalytics
);

/**
 * @route   GET /api/v1/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private (Admin)
 */
router.get(
  '/revenue',
  validate(dateRangeValidation),
  analyticsController.getRevenueAnalytics
);

/**
 * @route   GET /api/v1/analytics/vendors
 * @desc    Get vendor performance
 * @access  Private (Admin)
 */
router.get(
  '/vendors',
  validate(vendorIdQueryValidation),
  analyticsController.getVendorPerformance
);

/**
 * @route   GET /api/v1/analytics/services
 * @desc    Get service analytics
 * @access  Private (Admin)
 */
router.get('/services', analyticsController.getServiceAnalytics);

/**
 * @route   GET /api/v1/analytics/disputes
 * @desc    Get dispute analytics
 * @access  Private (Admin)
 */
router.get('/disputes', analyticsController.getDisputeAnalytics);

/**
 * @route   GET /api/v1/analytics/referrals
 * @desc    Get referral analytics
 * @access  Private (Admin)
 */
router.get('/referrals', analyticsController.getReferralAnalytics);

/**
 * @route   GET /api/v1/analytics/export/:type
 * @desc    Export analytics data
 * @access  Private (Admin)
 */
router.get(
  '/export/:type',
  validate([...exportTypeValidation, ...dateRangeValidation]),
  analyticsController.exportAnalytics
);

export default router;
