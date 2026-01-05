import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import authService from '../services/auth.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import notificationService from '../services/notification.service';
import logger from '../utils/logger';
class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  public register = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      console.log('📥 Registration request body:', JSON.stringify(req.body, null, 2));
    console.log('📍 Location data:', req.body.location);
      const { user, tokens } = await authService.register(req.body);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;

      return ResponseHandler.created(res, 'Registration successful', {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    }
  );

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  public login = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { email, password, fcmToken, deviceType, deviceName } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent') || 'Unknown';

      const { user, tokens } = await authService.login(email, password, ipAddress, userAgent);



       if (fcmToken && deviceType) {
    try {
      await notificationService.registerDeviceToken(
        user._id.toString(),
        fcmToken,
        deviceType,
        deviceName || `${deviceType} Device`
      );
    } catch (fcmError) {
      logger.error(`Failed to register FCM token:`, fcmError);
    }
  }


      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;

      return ResponseHandler.success(res, 'Login successful', {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    }
  );

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  public refreshToken = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { refreshToken } = req.body;

      const tokens = await authService.refreshToken(refreshToken);

      return ResponseHandler.success(res, 'Token refreshed successfully', {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    }
  );

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  public logout = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      await authService.logout(userId);

      return ResponseHandler.success(res, 'Logout successful');
    }
  );

  /**
   * Verify email
   * POST /api/v1/auth/verify-email
   */
  public verifyEmail = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { token } = req.body;

      const user = await authService.verifyEmail(token);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;

      return ResponseHandler.success(res, 'Email verified successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Resend verification email
   * POST /api/v1/auth/resend-verification
   */
  public resendVerification = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { email } = req.body;

      await authService.resendVerificationEmail(email);

      return ResponseHandler.success(res, 'Verification email sent successfully');
    }
  );

  /**
   * Forgot password
   * POST /api/v1/auth/forgot-password
   */
  public forgotPassword = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { email } = req.body;

      await authService.forgotPassword(email);

      return ResponseHandler.success(
        res,
        'If an account exists with this email, a password reset link has been sent'
      );
    }
  );

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  public resetPassword = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { token, password } = req.body;

      await authService.resetPassword(token, password);

      return ResponseHandler.success(res, 'Password reset successful');
    }
  );

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  public changePassword = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(userId, currentPassword, newPassword);

      return ResponseHandler.success(res, 'Password changed successfully');
    }
  );

  /**
   * Get current user
   * GET /api/v1/auth/me
   */
  public getCurrentUser = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const User = require('../models/User').default;

      const user = await User.findById(userId).populate(
        'vendorProfile.categories',
        'name icon'
      );

      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;

      return ResponseHandler.success(res, 'User retrieved successfully', {
        user: userResponse,
      });
    }
  );
}

export default new AuthController();
