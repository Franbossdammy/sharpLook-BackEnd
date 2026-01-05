"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const rateLimit_1 = require("../middlewares/rateLimit");
const auth_validation_1 = require("../validations/auth.validation");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', rateLimit_1.authLimiter, (0, validate_1.validate)(auth_validation_1.registerValidation), auth_controller_1.default.register);
/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', rateLimit_1.authLimiter, (0, validate_1.validate)(auth_validation_1.loginValidation), auth_controller_1.default.login);
/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', (0, validate_1.validate)(auth_validation_1.refreshTokenValidation), auth_controller_1.default.refreshToken);
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', auth_1.authenticate, auth_controller_1.default.logout);
/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', (0, validate_1.validate)(auth_validation_1.verifyEmailValidation), auth_controller_1.default.verifyEmail);
/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', rateLimit_1.authLimiter, (0, validate_1.validate)(auth_validation_1.resendVerificationValidation), auth_controller_1.default.resendVerification);
/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', rateLimit_1.passwordResetLimiter, (0, validate_1.validate)(auth_validation_1.forgotPasswordValidation), auth_controller_1.default.forgotPassword);
/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', rateLimit_1.passwordResetLimiter, (0, validate_1.validate)(auth_validation_1.resetPasswordValidation), auth_controller_1.default.resetPassword);
/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post('/change-password', auth_1.authenticate, (0, validate_1.validate)(auth_validation_1.changePasswordValidation), auth_controller_1.default.changePassword);
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', auth_1.authenticate, auth_controller_1.default.getCurrentUser);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map