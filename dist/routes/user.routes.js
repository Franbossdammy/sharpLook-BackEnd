"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = __importDefault(require("../controllers/user.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const user_validation_1 = require("../validations/user.validation");
const upload_1 = require("../middlewares/upload");
const activityTracker_1 = require("../middlewares/activityTracker");
const router = (0, express_1.Router)();
router.use(activityTracker_1.updateUserActivity);
/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', auth_1.authenticate, user_controller_1.default.getProfile);
/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile (with optional avatar upload)
 * @access  Private
 */
router.put('/profile', auth_1.authenticate, upload_1.uploadSingleImage, // Add upload middleware BEFORE validation
(0, validate_1.validate)(user_validation_1.updateProfileValidation), user_controller_1.default.updateProfile);
/**
 * @route   POST /api/v1/users/avatar
 * @desc    Upload/Update user avatar
 * @access  Private
 */
router.post('/avatar', auth_1.authenticate, upload_1.uploadSingleImage, user_controller_1.default.uploadAvatar);
/**
 * @route   DELETE /api/v1/users/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', auth_1.authenticate, user_controller_1.default.deleteAvatar);
/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', auth_1.authenticate, (0, validate_1.validate)(user_validation_1.updatePreferencesValidation), user_controller_1.default.updatePreferences);
/**
 * @route   POST /api/v1/users/withdrawal-pin
 * @desc    Set withdrawal PIN
 * @access  Private
 */
router.post('/withdrawal-pin', auth_1.authenticate, (0, validate_1.validate)(user_validation_1.setWithdrawalPinValidation), user_controller_1.default.setWithdrawalPin);
/**
 * @route   POST /api/v1/users/verify-withdrawal-pin
 * @desc    Verify withdrawal PIN
 * @access  Private
 */
router.post('/verify-withdrawal-pin', auth_1.authenticate, (0, validate_1.validate)(user_validation_1.verifyWithdrawalPinValidation), user_controller_1.default.verifyWithdrawalPin);
/**
 * @route   POST /api/v1/users/become-vendor
 * @desc    Register as vendor
 * @access  Private
 */
router.post('/become-vendor', auth_1.authenticate, (0, validate_1.validate)(user_validation_1.becomeVendorValidation), user_controller_1.default.becomeVendor);
/**
 * @route   PUT /api/v1/users/vendor-profile
 * @desc    Update vendor profile
 * @access  Private (Vendor only)
 */
router.put('/vendor-profile', auth_1.authenticate, (0, validate_1.validate)(user_validation_1.updateVendorProfileValidation), user_controller_1.default.updateVendorProfile);
/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', auth_1.authenticate, user_controller_1.default.getUserStats);
/**
 * @route   PUT /api/v1/users/location
 * @desc    Update user location
 * @access  Private
 */
router.put('/location', auth_1.authenticate, (0, validate_1.validate)(user_validation_1.updateLocationValidation), user_controller_1.default.updateLocation);
/**
 * @route   GET /api/v1/users/nearby-vendors
 * @desc    Get nearby vendors based on location
 * @access  Public (with optional auth)
 */
router.get('/nearby-vendors', auth_1.optionalAuth, (0, validate_1.validate)(user_validation_1.getNearbyVendorsValidation), user_controller_1.default.getNearbyVendors);
/**
 * @route   GET /api/v1/users/top-vendors
 * @desc    Get top-rated vendors
 * @access  Public (with optional auth)
 */
router.get('/top-vendors', auth_1.optionalAuth, (0, validate_1.validate)(user_validation_1.getTopVendorsValidation), user_controller_1.default.getTopVendors);
/**
 * @route   GET /api/v1/users/vendors
 * @desc    Get vendors with filters
 * @access  Public (with optional auth)
 */
router.get('/vendors', auth_1.optionalAuth, validate_1.validatePagination, (0, validate_1.validate)(user_validation_1.getVendorsValidation), user_controller_1.default.getVendors);
// ==================== ADMIN ROUTES ====================
/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin)
 * @access  Private (Admin)
 */
router.get('/', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(user_validation_1.getUsersValidation), user_controller_1.default.getAllUsers);
/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID (admin)
 * @access  Private (Admin)
 */
router.get('/:userId', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(user_validation_1.userIdValidation), user_controller_1.default.getUserById);
/**
 * @route   PUT /api/v1/users/:userId/status
 * @desc    Update user status (admin)
 * @access  Private (Admin)
 */
router.put('/:userId/status', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(user_validation_1.updateUserStatusValidation), user_controller_1.default.updateUserStatus);
/**
 * @route   POST /api/v1/users/:userId/verify-vendor
 * @desc    Verify vendor (admin)
 * @access  Private (Admin)
 */
router.post('/:userId/verify-vendor', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(user_validation_1.userIdValidation), user_controller_1.default.verifyVendor);
/**
 * @route   GET /api/v1/users/vendors/:vendorId
 * @desc    Get full vendor details (profile, services, reviews)
 * @access  Public (with optional auth)
 */
router.get('/vendors/:vendorId', auth_1.optionalAuth, (0, validate_1.validate)(user_validation_1.getVendorDetailsValidation), user_controller_1.default.getVendorFullDetails);
/**
 * @route   DELETE /api/v1/users/:userId
 * @desc    Soft delete user (admin)
 * @access  Private (Super Admin)
 */
router.delete('/:userId', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(user_validation_1.userIdValidation), user_controller_1.default.softDeleteUser);
/**
 * @route   POST /api/v1/users/:userId/restore
 * @desc    Restore deleted user (admin)
 * @access  Private (Super Admin)
 */
router.post('/:userId/restore', auth_1.authenticate, auth_1.requireSuperAdmin, (0, validate_1.validate)(user_validation_1.userIdValidation), user_controller_1.default.restoreUser);
exports.default = router;
//# sourceMappingURL=user.routes.js.map