import { body, param, query } from 'express-validator';
import { VendorType, UserStatus, UserRole } from '../types';
import mongoose from 'mongoose';

/**
 * Update profile validation
 */
export const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^(\+234|234|0)[7-9][0-1]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),

  body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
];

/**
 * Update preferences validation
 */
export const updatePreferencesValidation = [
  body('darkMode').optional().isBoolean(),
  body('fingerprintEnabled').optional().isBoolean(),
  body('notificationsEnabled').optional().isBoolean(),
  body('emailNotifications').optional().isBoolean(),
  body('pushNotifications').optional().isBoolean(),
];

/**
 * Set withdrawal PIN validation
 */
export const setWithdrawalPinValidation = [
  body('pin')
    .notEmpty()
    .withMessage('PIN is required')
    .matches(/^\d{4,6}$/)
    .withMessage('PIN must be 4-6 digits'),

  body('confirmPin')
    .notEmpty()
    .withMessage('Please confirm your PIN')
    .custom((value, { req }) => {
      if (value !== req.body.pin) {
        throw new Error('PINs do not match');
      }
      return true;
    }),
];

/**
 * Verify withdrawal PIN validation
 */
export const verifyWithdrawalPinValidation = [
  body('pin')
    .notEmpty()
    .withMessage('PIN is required')
    .matches(/^\d{4,6}$/)
    .withMessage('PIN must be 4-6 digits'),
];

/**
 * Become vendor validation
 */
export const becomeVendorValidation = [
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Business name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Business name must be between 3 and 100 characters'),

  body('businessDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Business description cannot exceed 500 characters'),

  body('vendorType')
    .notEmpty()
    .withMessage('Vendor type is required')
    .isIn(Object.values(VendorType))
    .withMessage('Invalid vendor type'),

  body('categories').optional().isArray().withMessage('Categories must be an array'),

  body('categories.*').optional().isMongoId().withMessage('Invalid category ID'),

  body('location.address')
    .if(body('vendorType').isIn([VendorType.HOME_SERVICE, VendorType.BOTH]))
    .notEmpty()
    .withMessage('Address is required for home service vendors'),

  body('location.city')
    .if(body('vendorType').isIn([VendorType.HOME_SERVICE, VendorType.BOTH]))
    .notEmpty()
    .withMessage('City is required'),

  body('location.state')
    .if(body('vendorType').isIn([VendorType.HOME_SERVICE, VendorType.BOTH]))
    .notEmpty()
    .withMessage('State is required'),

  body('location.country')
    .if(body('vendorType').isIn([VendorType.HOME_SERVICE, VendorType.BOTH]))
    .notEmpty()
    .withMessage('Country is required'),

  body('location.coordinates')
    .if(body('vendorType').isIn([VendorType.HOME_SERVICE, VendorType.BOTH]))
    .notEmpty()
    .withMessage('Coordinates are required')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),

  body('location.coordinates.*')
    .optional()
    .isFloat()
    .withMessage('Coordinates must be valid numbers'),

  body('serviceRadius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Service radius must be between 1 and 100 km'),
];

/**
 * Update vendor profile validation
 */
export const updateVendorProfileValidation = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Business name must be between 3 and 100 characters'),

  body('businessDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Business description cannot exceed 500 characters'),

  body('vendorType')
    .optional()
    .isIn(Object.values(VendorType))
    .withMessage('Invalid vendor type'),

  body('categories').optional().isArray().withMessage('Categories must be an array'),

  body('categories.*').optional().isMongoId().withMessage('Invalid category ID'),

  body('serviceRadius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Service radius must be between 1 and 100 km'),

  body('availability').optional().isObject().withMessage('Availability must be an object'),
];

// Add this to your user.validation.ts file

/**
 * Get top vendors validation
 */
export const getTopVendorsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('vendorType')
    .optional()
    .isIn(Object.values(VendorType))
    .withMessage('Invalid vendor type'),

  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Minimum rating must be between 0 and 5'),
];


/**
 * Validation for getting vendor full details
 */
export const getVendorDetailsValidation = [
  param('vendorId')
    .trim()
    .notEmpty()
    .withMessage('Vendor ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid vendor ID format');
      }
      return true;
    }),
  query('includeServices')
    .optional()
    .isBoolean()
    .withMessage('includeServices must be a boolean'),
  query('includeReviews')
    .optional()
    .isBoolean()
    .withMessage('includeReviews must be a boolean'),
  query('reviewsLimit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('reviewsLimit must be between 1 and 100'),
];

/**
 * Get users validation (admin)
 */
export const getUsersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid user role'),

  query('status')
    .optional()
    .isIn(Object.values(UserStatus))
    .withMessage('Invalid user status'),

  query('isVendor').optional().isBoolean().withMessage('isVendor must be a boolean'),

  query('search').optional().trim().isLength({ min: 1 }),
];

/**
 * Get vendors validation
 */
export const getVendorsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('vendorType')
    .optional()
    .isIn(Object.values(VendorType))
    .withMessage('Invalid vendor type'),

  query('category').optional().isMongoId().withMessage('Invalid category ID'),

  query('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),

  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),

  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),

  query('maxDistance')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max distance must be between 1 and 100 km'),

  query('search').optional().trim().isLength({ min: 1 }),
];

/**
 * Update user status validation (admin)
 */
export const updateUserStatusValidation = [
  param('userId').isMongoId().withMessage('Invalid user ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(UserStatus))
    .withMessage('Invalid user status'),
];

/**
 * User ID param validation
 */
export const userIdValidation = [
  param('userId').isMongoId().withMessage('Invalid user ID'),
];


/**
 * Update location validation
 */
export const updateLocationValidation = [
  body('location.type')
    .equals('Point')
    .withMessage('Location type must be "Point"'),
  
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  
  body('location.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('location.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  
  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  
  body('location.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
];

/**
 * Get nearby vendors validation
 */
export const getNearbyVendorsValidation = [
  query('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  query('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  query('maxDistance')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Max distance must be between 100 and 50000 meters'),
  
  query('vendorType')
    .optional()
    .isIn(Object.values(VendorType))
    .withMessage('Invalid vendor type'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Minimum rating must be between 0 and 5'),
];