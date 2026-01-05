import { Router } from 'express';
import referralController from '../controllers/referral.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  applyReferralCodeValidation,
  referralIdValidation,
  getReferralsValidation,
  getLeaderboardValidation,
  getAdminReferralsValidation,
  validateReferralCodeValidation,
} from '../validations/referral.validation';

const router = Router();



// Add this route to your referral routes file (referral.routes.ts)
// Add it BEFORE the '/:referralId' route to avoid conflicts

/**
 * @route   POST /api/v1/referrals/validate
 * @desc    Validate referral code (public - for registration form)
 * @access  Public
 */
router.post(
  '/validate',
  validate(validateReferralCodeValidation),
  referralController.validateReferralCode
);


/**
 * @route   POST /api/v1/referrals/apply
 * @desc    Apply referral code
 * @access  Private
 */
router.post(
  '/apply',
  authenticate,
  validate(applyReferralCodeValidation),
  referralController.applyReferralCode
);

/**
 * @route   GET /api/v1/referrals/stats
 * @desc    Get user's referral stats
 * @access  Private
 */
router.get('/stats', authenticate, referralController.getReferralStats);

/**
 * @route   GET /api/v1/referrals/my-referrals
 * @desc    Get user's referrals
 * @access  Private
 */
router.get(
  '/my-referrals',
  authenticate,
  validatePagination,
  validate(getReferralsValidation),
  referralController.getUserReferrals
);

/**
 * @route   GET /api/v1/referrals/leaderboard
 * @desc    Get referral leaderboard
 * @access  Public
 */
router.get(
  '/leaderboard',
  validate(getLeaderboardValidation),
  referralController.getLeaderboard
);

/**
 * @route   GET /api/v1/referrals/:referralId
 * @desc    Get referral by ID
 * @access  Private
 */
router.get(
  '/:referralId',
  authenticate,
  validate(referralIdValidation),
  referralController.getReferralById
);

// Admin routes
/**
 * @route   GET /api/v1/referrals
 * @desc    Get all referrals (Admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getAdminReferralsValidation),
  referralController.getAllReferrals
);

/**
 * @route   GET /api/v1/referrals/admin/stats
 * @desc    Get referral statistics (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, referralController.getAdminStats);

export default router;
