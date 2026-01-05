import { Response, NextFunction } from 'express';
import { AuthRequest, VendorType } from '../types';
import userService from '../services/user.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

class UserController {
  /**
   * Get user profile
   * GET /api/v1/users/profile
   */
 // REPLACE YOUR getProfile CONTROLLER METHOD WITH THIS:

/**
 * Get user profile
 */
public getProfile = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    const user = await userService.getProfile(userId);

    // ✅ FIX: Check if toObject exists before calling it
    // The service now returns a plain object with hasWithdrawalPin already included
    const userResponse = user.toObject ? user.toObject() : user;
    
    // Remove sensitive data (password and refreshToken should already be excluded)
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.withdrawalPin; // Already removed in service, but safe to delete again

    return ResponseHandler.success(res, 'Profile retrieved successfully', {
      user: userResponse,
    });
  }
);

  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  public updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      // Extract uploaded file
      const avatarFile = req.file;
      
      // Prepare update data with proper typing
      const updateData: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        avatar?: string;
        image?: string;
      } = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
      };

      // Handle avatar upload
      if (avatarFile) {
        try {
          // Get current user to delete old avatar
          const currentUser = await userService.getUserById(userId);
          
          // Delete old avatar from Cloudinary if exists
          if (currentUser.avatar) {
            try {
              await deleteFromCloudinary(currentUser.avatar);
              logger.info(`Deleted old avatar for user: ${userId}`);
            } catch (error) {
              logger.warn(`Failed to delete old avatar: ${error}`);
              // Continue even if deletion fails
            }
          }

          // Upload new avatar to Cloudinary
          const avatarUrl = await uploadToCloudinary(avatarFile.buffer, {
            folder: 'sharplook/avatars',
            transformation: [
              { width: 500, height: 500, crop: 'fill', gravity: 'face' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });

          updateData.avatar = avatarUrl;
          logger.info(`Avatar uploaded successfully for user: ${userId}`);
        } catch (error) {
          logger.error('Avatar upload failed:', error);
          throw new BadRequestError('Failed to upload avatar image');
        }
      }

      // Update user profile
      const user = await userService.updateProfile(userId, updateData);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Profile updated successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Update user preferences
   * PUT /api/v1/users/preferences
   */
  public updatePreferences = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.updatePreferences(userId, req.body);

      return ResponseHandler.success(res, 'Preferences updated successfully', {
        preferences: user.preferences,
      });
    }
  );

  /**
   * Set withdrawal PIN
   * POST /api/v1/users/withdrawal-pin
   */
  public setWithdrawalPin = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { pin } = req.body;

      await userService.setWithdrawalPin(userId, pin);

      return ResponseHandler.success(res, 'Withdrawal PIN set successfully');
    }
  );

  /**
   * Verify withdrawal PIN
   * POST /api/v1/users/verify-withdrawal-pin
   */
  public verifyWithdrawalPin = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { pin } = req.body;

      const isValid = await userService.verifyWithdrawalPin(userId, pin);

      return ResponseHandler.success(res, 'PIN verification result', {
        isValid,
      });
    }
  );

  /**
   * Become vendor
   * POST /api/v1/users/become-vendor
   */
  public becomeVendor = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.becomeVendor(userId, req.body);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Vendor registration successful', {
        user: userResponse,
      });
    }
  );

  /**
   * Update vendor profile
   * PUT /api/v1/users/vendor-profile
   */
  public updateVendorProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const user = await userService.updateVendorProfile(userId, req.body);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Vendor profile updated successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Get all users (admin)
   * GET /api/v1/users
   */
  public getAllUsers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        role: req.query.role as string,
        status: req.query.status as string,
        isVendor: req.query.isVendor === 'true' ? true : req.query.isVendor === 'false' ? false : undefined,
        search: req.query.search as string,
      };

      const result = await userService.getAllUsers(page, limit, filters);

      return ResponseHandler.paginated(
        res,
        'Users retrieved successfully',
        result.users,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get vendors
   * GET /api/v1/users/vendors
   */
  public getVendors = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: any = {
        vendorType: req.query.vendorType as string,
        category: req.query.category as string,
        rating: req.query.rating ? parseFloat(req.query.rating as string) : undefined,
        search: req.query.search as string,
      };

      // Add location filter if coordinates provided
      if (req.query.latitude && req.query.longitude) {
        filters.location = {
          latitude: parseFloat(req.query.latitude as string),
          longitude: parseFloat(req.query.longitude as string),
          maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance as string) : 10,
        };
      }

      const result = await userService.getVendors(filters, page, limit);

      return ResponseHandler.paginated(
        res,
        'Vendors retrieved successfully',
        result.vendors,
        page,
        limit,
        result.total
      );
    }
  );

  public getTopVendors = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const filters: any = {
        vendorType: req.query.vendorType as string,
        category: req.query.category as string,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const vendors = await userService.getTopVendors(limit, filters);

      return ResponseHandler.success(res, 'Top vendors retrieved successfully', {
        vendors,
        count: vendors.length,
      });
    }
  );

  /**
   * Get full vendor details
   * GET /api/v1/users/vendors/:vendorId
   */
  public getVendorFullDetails = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { vendorId } = req.params;
      
      const includeServices = req.query.includeServices !== 'false';
      const includeReviews = req.query.includeReviews !== 'false';
      const reviewsLimit = parseInt(req.query.reviewsLimit as string) || 10;

      const vendorDetails = await userService.getVendorFullDetails(vendorId, {
        includeServices,
        includeReviews,
        reviewsLimit,
      });

      // Remove sensitive data from vendor object
      if (vendorDetails.vendor.refreshToken) {
        delete vendorDetails.vendor.refreshToken;
      }
      if (vendorDetails.vendor.withdrawalPin) {
        delete vendorDetails.vendor.withdrawalPin;
      }

      return ResponseHandler.success(
        res,
        'Vendor details retrieved successfully',
        vendorDetails
      );
    }
  );

  /**
   * Get user by ID (admin)
   * GET /api/v1/users/:userId
   */
  public getUserById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;

      const user = await userService.getUserById(userId);

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'User retrieved successfully', {
        user: userResponse,
      });
    }
  );

  /**
   * Update user status (admin)
   * PUT /api/v1/users/:userId/status
   */
  public updateUserStatus = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;
      const { status } = req.body;

      const user = await userService.updateUserStatus(userId, status);

      return ResponseHandler.success(res, 'User status updated successfully', {
        user: {
          id: user._id,
          email: user.email,
          status: user.status,
        },
      });
    }
  );

  /**
   * Verify vendor (admin)
   * POST /api/v1/users/:userId/verify-vendor
   */
  public verifyVendor = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;

      const user = await userService.verifyVendor(userId);

      return ResponseHandler.success(res, 'Vendor verified successfully', {
        user: {
          id: user._id,
          email: user.email,
          isVendor: user.isVendor,
          vendorProfile: user.vendorProfile,
        },
      });
    }
  );

  /**
   * Soft delete user (admin)
   * DELETE /api/v1/users/:userId
   */
  public softDeleteUser = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;
      const deletedBy = req.user!.id;

      await userService.softDeleteUser(userId, deletedBy);

      return ResponseHandler.success(res, 'User deleted successfully');
    }
  );

  /**
   * Restore deleted user (admin)
   * POST /api/v1/users/:userId/restore
   */
  public restoreUser = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { userId } = req.params;

      const user = await userService.restoreUser(userId);

      return ResponseHandler.success(res, 'User restored successfully', {
        user: {
          id: user._id,
          email: user.email,
          status: user.status,
        },
      });
    }
  );

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  public getUserStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const stats = await userService.getUserStats(userId);

      return ResponseHandler.success(res, 'User statistics retrieved successfully', {
        stats,
      });
    }
  );

  public uploadAvatar = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const avatarFile = req.file;

    if (!avatarFile) {
      throw new BadRequestError('Please upload an image file');
    }

    try {
      // Get current user
      const currentUser = await userService.getUserById(userId);

      // Delete old avatar if exists
      if (currentUser.avatar) {
        try {
          await deleteFromCloudinary(currentUser.avatar);
          logger.info(`Deleted old avatar for user: ${userId}`);
        } catch (error) {
          logger.warn(`Failed to delete old avatar: ${error}`);
        }
      }

      // Upload new avatar
      const avatarUrl = await uploadToCloudinary(avatarFile.buffer, {
        folder: 'sharplook/avatars',
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });

      // Update user
      const user = await userService.updateProfile(userId, { avatar: avatarUrl });

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;
      delete userResponse.withdrawalPin;

      return ResponseHandler.success(res, 'Avatar uploaded successfully', {
        user: userResponse,
        avatarUrl,
      });
    } catch (error) {
      logger.error('Avatar upload failed:', error);
      throw new BadRequestError('Failed to upload avatar');
    }
  }
);

/**
 * Delete avatar
 * DELETE /api/v1/users/avatar
 */
public deleteAvatar = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    try {
      // Get current user
      const currentUser = await userService.getUserById(userId);

      if (!currentUser.avatar) {
        throw new BadRequestError('No avatar to delete');
      }

      // Delete from Cloudinary
      await deleteFromCloudinary(currentUser.avatar);
      logger.info(`Deleted avatar for user: ${userId}`);

      // Update user (set avatar to undefined/null)
      const user = await userService.updateProfile(userId, { avatar: '' });

      return ResponseHandler.success(res, 'Avatar deleted successfully', {
        user: {
          id: user._id,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      logger.error('Avatar deletion failed:', error);
      throw new BadRequestError('Failed to delete avatar');
    }
  }
);

/**
 * Update online status manually
 * POST /api/v1/users/online-status
 */
public updateOnlineStatus = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      throw new BadRequestError('isOnline must be a boolean value');
    }

    await userService.updateOnlineStatus(userId, isOnline);

    return ResponseHandler.success(res, 'Online status updated successfully', {
      isOnline,
    });
  }
);

/**
 * Heartbeat endpoint to keep user online
 * POST /api/v1/users/heartbeat
 */
public heartbeat = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    await userService.updateUserActivity(userId);

    return ResponseHandler.success(res, 'Activity updated', {
      timestamp: new Date(),
    });
  }
);


  /**
   * Update user location
   * PUT /api/v1/users/location
   */
  public updateLocation = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { location } = req.body;

      const user = await userService.updateUserLocation(userId, location);

      return ResponseHandler.success(res, 'Location updated successfully', {
        location: user.location,
      });
    }
  );

   /**
   * Get nearby vendors
   * GET /api/v1/users/nearby-vendors
   */
  public getNearbyVendors = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { latitude, longitude, maxDistance, vendorType, category, minRating } = req.query;

      if (!latitude || !longitude) {
        throw new BadRequestError('Latitude and longitude are required');
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const maxDist = maxDistance ? parseInt(maxDistance as string) : 10000;

      const filters: any = {};
      if (vendorType) filters.vendorType = vendorType as VendorType;
      if (category) filters.category = category as string;
      if (minRating) filters.minRating = parseFloat(minRating as string);

      const result = await userService.getNearbyVendors(lat, lng, maxDist, filters);

      return ResponseHandler.success(res, 'Nearby vendors retrieved successfully', {
        vendors: result.vendors,
        total: result.total,
        query: {
          location: { latitude: lat, longitude: lng },
          maxDistance: maxDist,
          filters,
        }
      });
    }
  );
}

export default new UserController();