"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationValidation = exports.verifyEmailValidation = exports.changePasswordValidation = exports.resetPasswordValidation = exports.forgotPasswordValidation = exports.refreshTokenValidation = exports.loginValidation = exports.registerValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Register validation
 */
exports.registerValidation = [
    (0, express_validator_1.body)('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    (0, express_validator_1.body)('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        // .matches(/^(\+234|234|0)[7-9][0-1]\d{8}$/)
        .withMessage('Please provide a valid Nigerian phone number'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    (0, express_validator_1.body)('confirmPassword')
        .notEmpty()
        .withMessage('Please confirm your password')
        .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
    (0, express_validator_1.body)('referredBy').optional().trim().isLength({ min: 8, max: 8 }),
    (0, express_validator_1.body)('isVendor').optional().isBoolean(),
    // ✅ FIXED: Comprehensive location validation
    (0, express_validator_1.body)('location')
        .optional()
        .custom((value) => {
        // If location is not provided, it's optional
        if (!value)
            return true;
        // Validate structure
        if (typeof value !== 'object') {
            throw new Error('Location must be an object');
        }
        if (value.type !== 'Point') {
            throw new Error('Location type must be "Point"');
        }
        if (!Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
            throw new Error('Location coordinates must be an array of [longitude, latitude]');
        }
        const [longitude, latitude] = value.coordinates;
        if (typeof longitude !== 'number' || typeof latitude !== 'number') {
            throw new Error('Coordinates must be numbers');
        }
        if (longitude < -180 || longitude > 180) {
            throw new Error('Longitude must be between -180 and 180');
        }
        if (latitude < -90 || latitude > 90) {
            throw new Error('Latitude must be between -90 and 90');
        }
        if (!value.address || typeof value.address !== 'string' || !value.address.trim()) {
            throw new Error('Location address is required');
        }
        if (!value.city || typeof value.city !== 'string' || !value.city.trim()) {
            throw new Error('Location city is required');
        }
        if (!value.state || typeof value.state !== 'string' || !value.state.trim()) {
            throw new Error('Location state is required');
        }
        if (!value.country || typeof value.country !== 'string' || !value.country.trim()) {
            throw new Error('Location country is required');
        }
        return true;
    })
        .withMessage('Invalid location data'),
];
/**
 * Login validation
 */
exports.loginValidation = [
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
];
/**
 * Refresh token validation
 */
exports.refreshTokenValidation = [
    (0, express_validator_1.body)('refreshToken').notEmpty().withMessage('Refresh token is required'),
];
/**
 * Forgot password validation
 */
exports.forgotPasswordValidation = [
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
];
/**
 * Reset password validation
 */
exports.resetPasswordValidation = [
    (0, express_validator_1.body)('token').notEmpty().withMessage('Reset token is required'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    (0, express_validator_1.body)('confirmPassword')
        .notEmpty()
        .withMessage('Please confirm your password')
        .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
];
/**
 * Change password validation
 */
exports.changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
            throw new Error('New password must be different from current password');
        }
        return true;
    }),
    (0, express_validator_1.body)('confirmPassword')
        .notEmpty()
        .withMessage('Please confirm your new password')
        .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
];
/**
 * Verify email validation
 */
exports.verifyEmailValidation = [
    (0, express_validator_1.body)('token').notEmpty().withMessage('Verification token is required'),
];
/**
 * Resend verification email validation
 */
exports.resendVerificationValidation = [
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
];
//# sourceMappingURL=auth.validation.js.map