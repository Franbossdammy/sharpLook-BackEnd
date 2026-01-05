"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const referral_controller_1 = __importDefault(require("../controllers/referral.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const referral_validation_1 = require("../validations/referral.validation");
const router = (0, express_1.Router)();
// Add this route to your referral routes file (referral.routes.ts)
// Add it BEFORE the '/:referralId' route to avoid conflicts
/**
 * @route   POST /api/v1/referrals/validate
 * @desc    Validate referral code (public - for registration form)
 * @access  Public
 */
router.post('/validate', (0, validate_1.validate)(referral_validation_1.validateReferralCodeValidation), referral_controller_1.default.validateReferralCode);
/**
 * @route   POST /api/v1/referrals/apply
 * @desc    Apply referral code
 * @access  Private
 */
router.post('/apply', auth_1.authenticate, (0, validate_1.validate)(referral_validation_1.applyReferralCodeValidation), referral_controller_1.default.applyReferralCode);
/**
 * @route   GET /api/v1/referrals/stats
 * @desc    Get user's referral stats
 * @access  Private
 */
router.get('/stats', auth_1.authenticate, referral_controller_1.default.getReferralStats);
/**
 * @route   GET /api/v1/referrals/my-referrals
 * @desc    Get user's referrals
 * @access  Private
 */
router.get('/my-referrals', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(referral_validation_1.getReferralsValidation), referral_controller_1.default.getUserReferrals);
/**
 * @route   GET /api/v1/referrals/leaderboard
 * @desc    Get referral leaderboard
 * @access  Public
 */
router.get('/leaderboard', (0, validate_1.validate)(referral_validation_1.getLeaderboardValidation), referral_controller_1.default.getLeaderboard);
/**
 * @route   GET /api/v1/referrals/:referralId
 * @desc    Get referral by ID
 * @access  Private
 */
router.get('/:referralId', auth_1.authenticate, (0, validate_1.validate)(referral_validation_1.referralIdValidation), referral_controller_1.default.getReferralById);
// Admin routes
/**
 * @route   GET /api/v1/referrals
 * @desc    Get all referrals (Admin)
 * @access  Private (Admin)
 */
router.get('/', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(referral_validation_1.getAdminReferralsValidation), referral_controller_1.default.getAllReferrals);
/**
 * @route   GET /api/v1/referrals/admin/stats
 * @desc    Get referral statistics (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/stats', auth_1.authenticate, auth_1.requireAdmin, referral_controller_1.default.getAdminStats);
exports.default = router;
//# sourceMappingURL=referral.routes.js.map