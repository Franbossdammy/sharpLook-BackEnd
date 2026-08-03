import { Router } from 'express';
import analyticsController from '../controllers/vendorAnalytics.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @route   GET /api/v1/analytics/vendor
 * @desc    Get comprehensive vendor analytics
 * @access  Private (Vendor)
 */
router.get(
  '/vendor',
  authenticate,
  analyticsController.getVendorAnalytics
);

/**
 * @route   GET /api/v1/analytics/vendor/quick-stats
 * @desc    Get quick stats for vendor dashboard
 * @access  Private (Vendor)
 */
router.get(
  '/vendor/quick-stats',
  authenticate,
  analyticsController.getVendorQuickStats
);

/**
 * @route   GET /api/v1/analytics/vendor/dashboard
 * @desc    Get all dashboard data (wallet, schedule, analytics) in one request
 * @access  Private (Vendor)
 */
router.get(
  '/vendor/dashboard',
  authenticate,
  analyticsController.getDashboard
);

export default router;