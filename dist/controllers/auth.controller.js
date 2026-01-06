"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = __importDefault(require("../services/auth.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const notification_service_1 = __importDefault(require("../services/notification.service"));
const logger_1 = __importDefault(require("../utils/logger"));
class AuthController {
    constructor() {
        /**
         * Register new user
         * POST /api/v1/auth/register
         */
        this.register = (0, error_1.asyncHandler)(async (req, res, _next) => {
            console.log('📥 Registration request body:', JSON.stringify(req.body, null, 2));
            console.log('📍 Location data:', req.body.location);
            const { user, tokens } = await auth_service_1.default.register(req.body);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            return response_1.default.created(res, 'Registration successful', {
                user: userResponse,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
        });
        /**
         * Login user
         * POST /api/v1/auth/login
         */
        this.login = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { email, password, fcmToken, deviceType, deviceName } = req.body;
            // ✅ ADD DETAILED LOGGING
            console.log('═══════════════════════════════════════');
            console.log('📥 LOGIN REQUEST');
            console.log('═══════════════════════════════════════');
            console.log('📧 Email:', email);
            console.log('📱 FCM Token:', fcmToken ? `${fcmToken.substring(0, 30)}...` : 'NOT PROVIDED');
            console.log('📱 Device Type:', deviceType || 'NOT PROVIDED');
            console.log('📱 Device Name:', deviceName || 'NOT PROVIDED');
            console.log('📱 Full request body keys:', Object.keys(req.body));
            console.log('═══════════════════════════════════════');
            const ipAddress = req.ip;
            const userAgent = req.get('user-agent') || 'Unknown';
            const { user, tokens } = await auth_service_1.default.login(email, password, ipAddress, userAgent);
            // ✅ REGISTER FCM TOKEN
            if (fcmToken && deviceType) {
                console.log('');
                console.log('🔔 REGISTERING FCM TOKEN');
                console.log('═══════════════════════════════════════');
                console.log('👤 User ID:', user._id.toString());
                console.log('📱 Token Type:', fcmToken.startsWith('ExponentPushToken[') ? 'Expo' : 'FCM');
                console.log('📱 Device Type:', deviceType);
                console.log('📱 Device Name:', deviceName || `${deviceType} Device`);
                try {
                    await notification_service_1.default.registerDeviceToken(user._id.toString(), fcmToken, deviceType, deviceName || `${deviceType} Device`);
                    console.log('✅ FCM TOKEN REGISTERED SUCCESSFULLY');
                }
                catch (fcmError) {
                    console.error('❌ FCM TOKEN REGISTRATION FAILED:', fcmError.message);
                    logger_1.default.error(`Failed to register FCM token:`, fcmError);
                }
                console.log('═══════════════════════════════════════');
                console.log('');
            }
            else {
                console.log('');
                console.log('⚠️  FCM TOKEN REGISTRATION SKIPPED');
                console.log('═══════════════════════════════════════');
                console.log('Reason:', !fcmToken ? 'No token provided' : 'No device type provided');
                console.log('═══════════════════════════════════════');
                console.log('');
            }
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            return response_1.default.success(res, 'Login successful', {
                user: userResponse,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
        });
        /**
         * Refresh access token
         * POST /api/v1/auth/refresh-token
         */
        this.refreshToken = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { refreshToken } = req.body;
            const tokens = await auth_service_1.default.refreshToken(refreshToken);
            return response_1.default.success(res, 'Token refreshed successfully', {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
        });
        /**
         * Logout user
         * POST /api/v1/auth/logout
         */
        this.logout = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await auth_service_1.default.logout(userId);
            return response_1.default.success(res, 'Logout successful');
        });
        /**
         * Verify email
         * POST /api/v1/auth/verify-email
         */
        this.verifyEmail = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { token } = req.body;
            const user = await auth_service_1.default.verifyEmail(token);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            return response_1.default.success(res, 'Email verified successfully', {
                user: userResponse,
            });
        });
        /**
         * Resend verification email
         * POST /api/v1/auth/resend-verification
         */
        this.resendVerification = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { email } = req.body;
            await auth_service_1.default.resendVerificationEmail(email);
            return response_1.default.success(res, 'Verification email sent successfully');
        });
        /**
         * Forgot password
         * POST /api/v1/auth/forgot-password
         */
        this.forgotPassword = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { email } = req.body;
            await auth_service_1.default.forgotPassword(email);
            return response_1.default.success(res, 'If an account exists with this email, a password reset link has been sent');
        });
        /**
         * Reset password
         * POST /api/v1/auth/reset-password
         */
        this.resetPassword = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { token, password } = req.body;
            await auth_service_1.default.resetPassword(token, password);
            return response_1.default.success(res, 'Password reset successful');
        });
        /**
         * Change password
         * POST /api/v1/auth/change-password
         */
        this.changePassword = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            await auth_service_1.default.changePassword(userId, currentPassword, newPassword);
            return response_1.default.success(res, 'Password changed successfully');
        });
        /**
         * Get current user
         * GET /api/v1/auth/me
         */
        this.getCurrentUser = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const User = require('../models/User').default;
            const user = await User.findById(userId).populate('vendorProfile.categories', 'name icon');
            if (!user) {
                return response_1.default.notFound(res, 'User not found');
            }
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            return response_1.default.success(res, 'User retrieved successfully', {
                user: userResponse,
            });
        });
    }
}
exports.default = new AuthController();
//# sourceMappingURL=auth.controller.js.map