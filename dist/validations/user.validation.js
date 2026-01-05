"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyVendorsValidation = exports.updateLocationValidation = exports.userIdValidation = exports.updateUserStatusValidation = exports.getVendorsValidation = exports.getUsersValidation = exports.getVendorDetailsValidation = exports.getTopVendorsValidation = exports.updateVendorProfileValidation = exports.becomeVendorValidation = exports.verifyWithdrawalPinValidation = exports.setWithdrawalPinValidation = exports.updatePreferencesValidation = exports.updateProfileValidation = void 0;
const express_validator_1 = require("express-validator");
const types_1 = require("../types");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Update profile validation
 */
exports.updateProfileValidation = [
    (0, express_validator_1.body)('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .matches(/^(\+234|234|0)[7-9][0-1]\d{8}$/)
        .withMessage('Please provide a valid Nigerian phone number'),
    (0, express_validator_1.body)('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
];
/**
 * Update preferences validation
 */
exports.updatePreferencesValidation = [
    (0, express_validator_1.body)('darkMode').optional().isBoolean(),
    (0, express_validator_1.body)('fingerprintEnabled').optional().isBoolean(),
    (0, express_validator_1.body)('notificationsEnabled').optional().isBoolean(),
    (0, express_validator_1.body)('emailNotifications').optional().isBoolean(),
    (0, express_validator_1.body)('pushNotifications').optional().isBoolean(),
];
/**
 * Set withdrawal PIN validation
 */
exports.setWithdrawalPinValidation = [
    (0, express_validator_1.body)('pin')
        .notEmpty()
        .withMessage('PIN is required')
        .matches(/^\d{4,6}$/)
        .withMessage('PIN must be 4-6 digits'),
    (0, express_validator_1.body)('confirmPin')
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
exports.verifyWithdrawalPinValidation = [
    (0, express_validator_1.body)('pin')
        .notEmpty()
        .withMessage('PIN is required')
        .matches(/^\d{4,6}$/)
        .withMessage('PIN must be 4-6 digits'),
];
/**
 * Become vendor validation
 */
exports.becomeVendorValidation = [
    (0, express_validator_1.body)('businessName')
        .trim()
        .notEmpty()
        .withMessage('Business name is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Business name must be between 3 and 100 characters'),
    (0, express_validator_1.body)('businessDescription')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Business description cannot exceed 500 characters'),
    (0, express_validator_1.body)('vendorType')
        .notEmpty()
        .withMessage('Vendor type is required')
        .isIn(Object.values(types_1.VendorType))
        .withMessage('Invalid vendor type'),
    (0, express_validator_1.body)('categories').optional().isArray().withMessage('Categories must be an array'),
    (0, express_validator_1.body)('categories.*').optional().isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.body)('location.address')
        .if((0, express_validator_1.body)('vendorType').isIn([types_1.VendorType.HOME_SERVICE, types_1.VendorType.BOTH]))
        .notEmpty()
        .withMessage('Address is required for home service vendors'),
    (0, express_validator_1.body)('location.city')
        .if((0, express_validator_1.body)('vendorType').isIn([types_1.VendorType.HOME_SERVICE, types_1.VendorType.BOTH]))
        .notEmpty()
        .withMessage('City is required'),
    (0, express_validator_1.body)('location.state')
        .if((0, express_validator_1.body)('vendorType').isIn([types_1.VendorType.HOME_SERVICE, types_1.VendorType.BOTH]))
        .notEmpty()
        .withMessage('State is required'),
    (0, express_validator_1.body)('location.country')
        .if((0, express_validator_1.body)('vendorType').isIn([types_1.VendorType.HOME_SERVICE, types_1.VendorType.BOTH]))
        .notEmpty()
        .withMessage('Country is required'),
    (0, express_validator_1.body)('location.coordinates')
        .if((0, express_validator_1.body)('vendorType').isIn([types_1.VendorType.HOME_SERVICE, types_1.VendorType.BOTH]))
        .notEmpty()
        .withMessage('Coordinates are required')
        .isArray({ min: 2, max: 2 })
        .withMessage('Coordinates must be [longitude, latitude]'),
    (0, express_validator_1.body)('location.coordinates.*')
        .optional()
        .isFloat()
        .withMessage('Coordinates must be valid numbers'),
    (0, express_validator_1.body)('serviceRadius')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Service radius must be between 1 and 100 km'),
];
/**
 * Update vendor profile validation
 */
exports.updateVendorProfileValidation = [
    (0, express_validator_1.body)('businessName')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Business name must be between 3 and 100 characters'),
    (0, express_validator_1.body)('businessDescription')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Business description cannot exceed 500 characters'),
    (0, express_validator_1.body)('vendorType')
        .optional()
        .isIn(Object.values(types_1.VendorType))
        .withMessage('Invalid vendor type'),
    (0, express_validator_1.body)('categories').optional().isArray().withMessage('Categories must be an array'),
    (0, express_validator_1.body)('categories.*').optional().isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.body)('serviceRadius')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Service radius must be between 1 and 100 km'),
    (0, express_validator_1.body)('availability').optional().isObject().withMessage('Availability must be an object'),
];
// Add this to your user.validation.ts file
/**
 * Get top vendors validation
 */
exports.getTopVendorsValidation = [
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
    (0, express_validator_1.query)('vendorType')
        .optional()
        .isIn(Object.values(types_1.VendorType))
        .withMessage('Invalid vendor type'),
    (0, express_validator_1.query)('category')
        .optional()
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.query)('minRating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Minimum rating must be between 0 and 5'),
];
/**
 * Validation for getting vendor full details
 */
exports.getVendorDetailsValidation = [
    (0, express_validator_1.param)('vendorId')
        .trim()
        .notEmpty()
        .withMessage('Vendor ID is required')
        .custom((value) => {
        if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid vendor ID format');
        }
        return true;
    }),
    (0, express_validator_1.query)('includeServices')
        .optional()
        .isBoolean()
        .withMessage('includeServices must be a boolean'),
    (0, express_validator_1.query)('includeReviews')
        .optional()
        .isBoolean()
        .withMessage('includeReviews must be a boolean'),
    (0, express_validator_1.query)('reviewsLimit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('reviewsLimit must be between 1 and 100'),
];
/**
 * Get users validation (admin)
 */
exports.getUsersValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('role')
        .optional()
        .isIn(Object.values(types_1.UserRole))
        .withMessage('Invalid user role'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(Object.values(types_1.UserStatus))
        .withMessage('Invalid user status'),
    (0, express_validator_1.query)('isVendor').optional().isBoolean().withMessage('isVendor must be a boolean'),
    (0, express_validator_1.query)('search').optional().trim().isLength({ min: 1 }),
];
/**
 * Get vendors validation
 */
exports.getVendorsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('vendorType')
        .optional()
        .isIn(Object.values(types_1.VendorType))
        .withMessage('Invalid vendor type'),
    (0, express_validator_1.query)('category').optional().isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.query)('rating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Rating must be between 0 and 5'),
    (0, express_validator_1.query)('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
    (0, express_validator_1.query)('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
    (0, express_validator_1.query)('maxDistance')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Max distance must be between 1 and 100 km'),
    (0, express_validator_1.query)('search').optional().trim().isLength({ min: 1 }),
];
/**
 * Update user status validation (admin)
 */
exports.updateUserStatusValidation = [
    (0, express_validator_1.param)('userId').isMongoId().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(Object.values(types_1.UserStatus))
        .withMessage('Invalid user status'),
];
/**
 * User ID param validation
 */
exports.userIdValidation = [
    (0, express_validator_1.param)('userId').isMongoId().withMessage('Invalid user ID'),
];
/**
 * Update location validation
 */
exports.updateLocationValidation = [
    (0, express_validator_1.body)('location.type')
        .equals('Point')
        .withMessage('Location type must be "Point"'),
    (0, express_validator_1.body)('location.coordinates')
        .isArray({ min: 2, max: 2 })
        .withMessage('Coordinates must be an array of [longitude, latitude]'),
    (0, express_validator_1.body)('location.coordinates.0')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    (0, express_validator_1.body)('location.coordinates.1')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.body)('location.address')
        .trim()
        .notEmpty()
        .withMessage('Address is required'),
    (0, express_validator_1.body)('location.city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),
    (0, express_validator_1.body)('location.state')
        .trim()
        .notEmpty()
        .withMessage('State is required'),
    (0, express_validator_1.body)('location.country')
        .trim()
        .notEmpty()
        .withMessage('Country is required'),
];
/**
 * Get nearby vendors validation
 */
exports.getNearbyVendorsValidation = [
    (0, express_validator_1.query)('latitude')
        .notEmpty()
        .withMessage('Latitude is required')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.query)('longitude')
        .notEmpty()
        .withMessage('Longitude is required')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    (0, express_validator_1.query)('maxDistance')
        .optional()
        .isInt({ min: 100, max: 50000 })
        .withMessage('Max distance must be between 100 and 50000 meters'),
    (0, express_validator_1.query)('vendorType')
        .optional()
        .isIn(Object.values(types_1.VendorType))
        .withMessage('Invalid vendor type'),
    (0, express_validator_1.query)('category')
        .optional()
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.query)('minRating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Minimum rating must be between 0 and 5'),
];
//# sourceMappingURL=user.validation.js.map