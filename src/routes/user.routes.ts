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
  changeWithdrawalPinValidation,
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
 * @route   PUT /api/v1/users/withdrawal-pin
 * @desc    Change withdrawal PIN
 * @access  Private
 */
router.put(
  '/withdrawal-pin',
  authenticate,
  validate(changeWithdrawalPinValidation),
  userController.changeWithdrawalPin
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

/**
 * @route   POST /api/v1/users/request-email-change
 * @desc    Request email change (authenticated user)
 * @access  Private
 */
router.post(
  '/request-email-change',
  authenticate,
  userController.requestEmailChange
);

/**
 * @route   DELETE /api/v1/users/cancel-email-change
 * @desc    Cancel pending email change request
 * @access  Private
 */
router.delete(
  '/cancel-email-change',
  authenticate,
  userController.cancelEmailChange
);

/**
 * @route   GET /api/v1/users/email-change-requests
 * @desc    Get all pending email change requests (admin)
 * @access  Private (Admin)
 */
router.get(
  '/email-change-requests',
  authenticate,
  requireAdmin,
  userController.getEmailChangeRequests
);

/**
 * @route   POST /api/v1/users/admin
 * @desc    Create admin user
 * @access  Private (Admin)
 */
router.post(
  '/admin',
  authenticate,
  requireAdmin,
  userController.createAdmin
);

/**
 * @route   PUT /api/v1/users/admin/:userId/role
 * @desc    Update admin user role
 * @access  Private (Admin)
 */
router.put(
  '/admin/:userId/role',
  authenticate,
  requireAdmin,
  userController.updateAdminRole
);

// ==================== SAVED / WISHLIST ROUTES ====================

router.get('/saved/ids', authenticate, userController.getSavedIds);
router.get('/saved/vendors', authenticate, userController.getSavedVendors);
router.get('/saved/products', authenticate, userController.getSavedProducts);
router.post('/saved/vendors/:vendorId', authenticate, userController.toggleSavedVendor);
router.post('/saved/products/:productId', authenticate, userController.toggleSavedProduct);

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
 * @route   POST /api/v1/users/:userId/approve-kyc
 * @desc    Approve vendor KYC (admin)
 * @access  Private (Admin)
 */
router.post(
  '/:userId/approve-kyc',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.approveKyc
);

/**
 * @route   POST /api/v1/users/:userId/reject-kyc
 * @desc    Reject vendor KYC with reason (admin)
 * @access  Private (Admin)
 */
router.post(
  '/:userId/reject-kyc',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.rejectKyc
);

/**
 * @route   POST /api/v1/users/:userId/kyc-edit-access
 * @desc    Allow or revoke vendor KYC edit access (admin)
 * @access  Private (Admin)
 */
router.post(
  '/:userId/kyc-edit-access',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.setKycEditAllowed
);

/**
 * @route   POST /api/v1/users/:userId/unlock
 * @desc    Unlock a locked account (admin)
 * @access  Private (Admin)
 */
router.post(
  '/:userId/unlock',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.unlockAccount
);

/**
 * @route   PUT /api/v1/users/:userId/approve-email-change
 * @desc    Approve a user's email change request (admin)
 * @access  Private (Admin)
 */
router.put(
  '/:userId/approve-email-change',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.approveEmailChange
);

/**
 * @route   PUT /api/v1/users/:userId/reject-email-change
 * @desc    Reject a user's email change request (admin)
 * @access  Private (Admin)
 */
router.put(
  '/:userId/reject-email-change',
  authenticate,
  requireAdmin,
  validate(userIdValidation),
  userController.rejectEmailChange
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