import { Router } from 'express';
import promoController from '../controllers/promo.controller';
import { authenticate, optionalAuth, requireAdmin } from '../middlewares/auth';

const router = Router();

/**
 * @route   GET /api/v1/promo/current
 * @desc    Get the active promo campaign + user eligibility
 * @access  Public (auth optional; if provided, includes userEligible flag)
 */
router.get('/current', optionalAuth, promoController.getCurrent);

/**
 * ==================== ADMIN ROUTES ====================
 */

/**
 * @route   GET /api/v1/promo/admin
 * @desc    List all promo campaigns
 * @access  Admin
 */
router.get('/admin', authenticate, requireAdmin, promoController.listCampaigns);

/**
 * @route   POST /api/v1/promo/admin
 * @desc    Create a new promo campaign
 * @access  Admin
 */
router.post('/admin', authenticate, requireAdmin, promoController.createCampaign);

/**
 * @route   GET /api/v1/promo/admin/:id/stats
 * @desc    Get stats for a promo campaign
 * @access  Admin
 */
router.get('/admin/:id/stats', authenticate, requireAdmin, promoController.getStats);

/**
 * @route   PATCH /api/v1/promo/admin/:id/pause
 * @desc    Pause or resume a promo campaign
 * @access  Admin
 */
router.patch('/admin/:id/pause', authenticate, requireAdmin, promoController.togglePause);

/**
 * @route   PATCH /api/v1/promo/admin/:id
 * @desc    Update a promo campaign
 * @access  Admin
 */
router.patch('/admin/:id', authenticate, requireAdmin, promoController.updateCampaign);

/**
 * @route   POST /api/v1/promo/admin/:id/clear-refunded
 * @desc    Clear refunded redemptions from a campaign (testing helper — bypasses
 *          the "refunded still counts" rule; do not use casually in prod)
 * @access  Admin
 */
router.post(
  '/admin/:id/clear-refunded',
  authenticate,
  requireAdmin,
  promoController.clearRefunded
);

export default router;
