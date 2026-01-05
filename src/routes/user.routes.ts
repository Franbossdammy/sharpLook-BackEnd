import { Router } from 'express';
import userController from '../controllers/user.controller';
import {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  optionalAuth,
} from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  updateProfileValidation,
  updatePreferencesValidation,
  setWithdrawalPinValidation,
  verifyWithdrawalPinValidation,
  becomeVendorValidation,
  updateVendorProfileValidation,
  getUsersValidation,
  getVendorsValidation,
  getTopVendorsValidation,
  updateUserStatusValidation,
  userIdValidation,
  getVendorDetailsValidation,
  updateLocationValidation,
  getNearbyVendorsValidation,
} from '../validations/user.validation';
import { uploadSingleImage } from '../middlewares/upload';
import { updateUserActivity } from '../middlewares/activityTracker';

const router = Router();


router.use(updateUserActivity);

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile (with optional avatar upload)
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  uploadSingleImage, // Add upload middleware BEFORE validation
  validate(updateProfileValidation),
  userController.updateProfile
);



/**
 * @route   POST /api/v1/users/avatar
 * @desc    Upload/Update user avatar
 * @access  Private
 */
router.post(
  '/avatar',
  authenticate,
  uploadSingleImage,
  userController.uploadAvatar
);

/**
 * @route   DELETE /api/v1/users/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete(
  '/avatar',
  authenticate,
  userController.deleteAvatar
);
/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  authenticate,
  validate(updatePreferencesValidation),
  userController.updatePreferences
);

/**
 * @route   POST /api/v1/users/withdrawal-pin
 * @desc    Set withdrawal PIN
 * @access  Private
 */
router.post(
  '/withdrawal-pin',
  authenticate,
  validate(setWithdrawalPinValidation),
  userController.setWithdrawalPin
);

/**
 * @route   POST /api/v1/users/verify-withdrawal-pin
 * @desc    Verify withdrawal PIN
 * @access  Private
 */
router.post(
  '/verify-withdrawal-pin',
  authenticate,
  validate(verifyWithdrawalPinValidation),
  userController.verifyWithdrawalPin
);

/**
 * @route   POST /api/v1/users/become-vendor
 * @desc    Register as vendor
 * @access  Private
 */
router.post(
  '/become-vendor',
  authenticate,
  validate(becomeVendorValidation),
  userController.becomeVendor
);

/**
 * @route   PUT /api/v1/users/vendor-profile
 * @desc    Update vendor profile
 * @access  Private (Vendor only)
 */
router.put(
  '/vendor-profile',
  authenticate,
  validate(updateVendorProfileValidation),
  userController.updateVendorProfile
);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticate, userController.getUserStats);


/**
 * @route   PUT /api/v1/users/location
 * @desc    Update user location
 * @access  Private
 */
router.put(
  '/location',
  authenticate,
  validate(updateLocationValidation),
  userController.updateLocation
);

/**
 * @route   GET /api/v1/users/nearby-vendors
 * @desc    Get nearby vendors based on location
 * @access  Public (with optional auth)
 */
router.get(
  '/nearby-vendors',
  optionalAuth,
  validate(getNearbyVendorsValidation),
  userController.getNearbyVendors
);
/**
 * @route   GET /api/v1/users/top-vendors
 * @desc    Get top-rated vendors
 * @access  Public (with optional auth)
 */
router.get(
  '/top-vendors',
  optionalAuth,
  validate(getTopVendorsValidation),
  userController.getTopVendors
);

/**
 * @route   GET /api/v1/users/vendors
 * @desc    Get vendors with filters
 * @access  Public (with optional auth)
 */
router.get(
  '/vendors',
  optionalAuth,
  validatePagination,
  validate(getVendorsValidation),
  userController.getVendors
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getUsersValidation),
  userController.getAllUsers
);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID (admin)
 * @access  Private (Admin)
 */
router.get(
  '/:userId',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.getUserById
);

/**
 * @route   PUT /api/v1/users/:userId/status
 * @desc    Update user status (admin)
 * @access  Private (Admin)
 */
router.put(
  '/:userId/status',
  authenticate,
  requireAdmin,
  validate(updateUserStatusValidation),
  userController.updateUserStatus
);

/**
 * @route   POST /api/v1/users/:userId/verify-vendor
 * @desc    Verify vendor (admin)
 * @access  Private (Admin)
 */
router.post(
  '/:userId/verify-vendor',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.verifyVendor
);

/**
 * @route   GET /api/v1/users/vendors/:vendorId
 * @desc    Get full vendor details (profile, services, reviews)
 * @access  Public (with optional auth)
 */
router.get(
  '/vendors/:vendorId',
  optionalAuth,
  validate(getVendorDetailsValidation),
  userController.getVendorFullDetails
);

/**
 * @route   DELETE /api/v1/users/:userId
 * @desc    Soft delete user (admin)
 * @access  Private (Super Admin)
 */
router.delete(
  '/:userId',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.softDeleteUser
);

/**
 * @route   POST /api/v1/users/:userId/restore
 * @desc    Restore deleted user (admin)
 * @access  Private (Super Admin)
 */
router.post(
  '/:userId/restore',
  authenticate,
  requireSuperAdmin,
  validate(userIdValidation),
  userController.restoreUser
);

export default router;