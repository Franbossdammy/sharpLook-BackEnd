"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = __importDefault(require("../services/user.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const cloudinary_1 = require("../utils/cloudinary");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class UserController {
    constructor() {
        /**
         * Get user profile
         * GET /api/v1/users/profile
         */
        // REPLACE YOUR getProfile CONTROLLER METHOD WITH THIS:
        /**
         * Get user profile
         */
        this.getProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.getProfile(userId);
            // ✅ FIX: Check if toObject exists before calling it
            // The service now returns a plain object with hasWithdrawalPin already included
            const userResponse = user.toObject ? user.toObject() : user;
            // Remove sensitive data (password and refreshToken should already be excluded)
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin; // Already removed in service, but safe to delete again
            return response_1.default.success(res, 'Profile retrieved successfully', {
                user: userResponse,
            });
        });
        /**
         * Update user profile
         * PUT /api/v1/users/profile
         */
        this.updateProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            // Extract uploaded file
            const avatarFile = req.file;
            // Prepare update data with proper typing
            const updateData = {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                phone: req.body.phone,
            };
            // Handle avatar upload
            if (avatarFile) {
                try {
                    // Get current user to delete old avatar
                    const currentUser = await user_service_1.default.getUserById(userId);
                    // Delete old avatar from Cloudinary if exists
                    if (currentUser.avatar) {
                        try {
                            await (0, cloudinary_1.deleteFromCloudinary)(currentUser.avatar);
                            logger_1.default.info(`Deleted old avatar for user: ${userId}`);
                        }
                        catch (error) {
                            logger_1.default.warn(`Failed to delete old avatar: ${error}`);
                            // Continue even if deletion fails
                        }
                    }
                    // Upload new avatar to Cloudinary
                    const avatarUrl = await (0, cloudinary_1.uploadToCloudinary)(avatarFile.buffer, {
                        folder: 'sharplook/avatars',
                        transformation: [
                            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                            { quality: 'auto' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    updateData.avatar = avatarUrl;
                    logger_1.default.info(`Avatar uploaded successfully for user: ${userId}`);
                }
                catch (error) {
                    logger_1.default.error('Avatar upload failed:', error);
                    throw new errors_1.BadRequestError('Failed to upload avatar image');
                }
            }
            // Update user profile
            const user = await user_service_1.default.updateProfile(userId, updateData);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'Profile updated successfully', {
                user: userResponse,
            });
        });
        /**
         * Update user preferences
         * PUT /api/v1/users/preferences
         */
        this.updatePreferences = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.updatePreferences(userId, req.body);
            return response_1.default.success(res, 'Preferences updated successfully', {
                preferences: user.preferences,
            });
        });
        /**
         * Set withdrawal PIN
         * POST /api/v1/users/withdrawal-pin
         */
        this.setWithdrawalPin = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { pin } = req.body;
            await user_service_1.default.setWithdrawalPin(userId, pin);
            return response_1.default.success(res, 'Withdrawal PIN set successfully');
        });
        /**
         * Verify withdrawal PIN
         * POST /api/v1/users/verify-withdrawal-pin
         */
        this.verifyWithdrawalPin = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { pin } = req.body;
            const isValid = await user_service_1.default.verifyWithdrawalPin(userId, pin);
            return response_1.default.success(res, 'PIN verification result', {
                isValid,
            });
        });
        /**
         * Become vendor
         * POST /api/v1/users/become-vendor
         */
        this.becomeVendor = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.becomeVendor(userId, req.body);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'Vendor registration successful', {
                user: userResponse,
            });
        });
        /**
         * Update vendor profile
         * PUT /api/v1/users/vendor-profile
         */
        this.updateVendorProfile = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const user = await user_service_1.default.updateVendorProfile(userId, req.body);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'Vendor profile updated successfully', {
                user: userResponse,
            });
        });
        /**
         * Get all users (admin)
         * GET /api/v1/users
         */
        this.getAllUsers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                role: req.query.role,
                status: req.query.status,
                isVendor: req.query.isVendor === 'true' ? true : req.query.isVendor === 'false' ? false : undefined,
                search: req.query.search,
            };
            const result = await user_service_1.default.getAllUsers(page, limit, filters);
            return response_1.default.paginated(res, 'Users retrieved successfully', result.users, page, limit, result.total);
        });
        /**
         * Get vendors
         * GET /api/v1/users/vendors
         */
        this.getVendors = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                vendorType: req.query.vendorType,
                category: req.query.category,
                rating: req.query.rating ? parseFloat(req.query.rating) : undefined,
                search: req.query.search,
            };
            // Add location filter if coordinates provided
            if (req.query.latitude && req.query.longitude) {
                filters.location = {
                    latitude: parseFloat(req.query.latitude),
                    longitude: parseFloat(req.query.longitude),
                    maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance) : 10,
                };
            }
            const result = await user_service_1.default.getVendors(filters, page, limit);
            return response_1.default.paginated(res, 'Vendors retrieved successfully', result.vendors, page, limit, result.total);
        });
        this.getTopVendors = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                vendorType: req.query.vendorType,
                category: req.query.category,
                minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
            };
            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const vendors = await user_service_1.default.getTopVendors(limit, filters);
            return response_1.default.success(res, 'Top vendors retrieved successfully', {
                vendors,
                count: vendors.length,
            });
        });
        /**
         * Get full vendor details
         * GET /api/v1/users/vendors/:vendorId
         */
        this.getVendorFullDetails = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { vendorId } = req.params;
            const includeServices = req.query.includeServices !== 'false';
            const includeReviews = req.query.includeReviews !== 'false';
            const reviewsLimit = parseInt(req.query.reviewsLimit) || 10;
            const vendorDetails = await user_service_1.default.getVendorFullDetails(vendorId, {
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
            return response_1.default.success(res, 'Vendor details retrieved successfully', vendorDetails);
        });
        /**
         * Get user by ID (admin)
         * GET /api/v1/users/:userId
         */
        this.getUserById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const user = await user_service_1.default.getUserById(userId);
            // Remove sensitive data
            const userResponse = user.toObject();
            delete userResponse.password;
            delete userResponse.refreshToken;
            delete userResponse.withdrawalPin;
            return response_1.default.success(res, 'User retrieved successfully', {
                user: userResponse,
            });
        });
        /**
         * Update user status (admin)
         * PUT /api/v1/users/:userId/status
         */
        this.updateUserStatus = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const { status } = req.body;
            const user = await user_service_1.default.updateUserStatus(userId, status);
            return response_1.default.success(res, 'User status updated successfully', {
                user: {
                    id: user._id,
                    email: user.email,
                    status: user.status,
                },
            });
        });
        /**
         * Verify vendor (admin)
         * POST /api/v1/users/:userId/verify-vendor
         */
        this.verifyVendor = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const user = await user_service_1.default.verifyVendor(userId);
            return response_1.default.success(res, 'Vendor verified successfully', {
                user: {
                    id: user._id,
                    email: user.email,
                    isVendor: user.isVendor,
                    vendorProfile: user.vendorProfile,
                },
            });
        });
        /**
         * Soft delete user (admin)
         * DELETE /api/v1/users/:userId
         */
        this.softDeleteUser = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const deletedBy = req.user.id;
            await user_service_1.default.softDeleteUser(userId, deletedBy);
            return response_1.default.success(res, 'User deleted successfully');
        });
        /**
         * Restore deleted user (admin)
         * POST /api/v1/users/:userId/restore
         */
        this.restoreUser = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { userId } = req.params;
            const user = await user_service_1.default.restoreUser(userId);
            return response_1.default.success(res, 'User restored successfully', {
                user: {
                    id: user._id,
                    email: user.email,
                    status: user.status,
                },
            });
        });
        /**
         * Get user statistics
         * GET /api/v1/users/stats
         */
        this.getUserStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const stats = await user_service_1.default.getUserStats(userId);
            return response_1.default.success(res, 'User statistics retrieved successfully', {
                stats,
            });
        });
        this.uploadAvatar = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const avatarFile = req.file;
            if (!avatarFile) {
                throw new errors_1.BadRequestError('Please upload an image file');
            }
            try {
                // Get current user
                const currentUser = await user_service_1.default.getUserById(userId);
                // Delete old avatar if exists
                if (currentUser.avatar) {
                    try {
                        await (0, cloudinary_1.deleteFromCloudinary)(currentUser.avatar);
                        logger_1.default.info(`Deleted old avatar for user: ${userId}`);
                    }
                    catch (error) {
                        logger_1.default.warn(`Failed to delete old avatar: ${error}`);
                    }
                }
                // Upload new avatar
                const avatarUrl = await (0, cloudinary_1.uploadToCloudinary)(avatarFile.buffer, {
                    folder: 'sharplook/avatars',
                    transformation: [
                        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                        { quality: 'auto' },
                        { fetch_format: 'auto' }
                    ]
                });
                // Update user
                const user = await user_service_1.default.updateProfile(userId, { avatar: avatarUrl });
                // Remove sensitive data
                const userResponse = user.toObject();
                delete userResponse.password;
                delete userResponse.refreshToken;
                delete userResponse.withdrawalPin;
                return response_1.default.success(res, 'Avatar uploaded successfully', {
                    user: userResponse,
                    avatarUrl,
                });
            }
            catch (error) {
                logger_1.default.error('Avatar upload failed:', error);
                throw new errors_1.BadRequestError('Failed to upload avatar');
            }
        });
        /**
         * Delete avatar
         * DELETE /api/v1/users/avatar
         */
        this.deleteAvatar = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            try {
                // Get current user
                const currentUser = await user_service_1.default.getUserById(userId);
                if (!currentUser.avatar) {
                    throw new errors_1.BadRequestError('No avatar to delete');
                }
                // Delete from Cloudinary
                await (0, cloudinary_1.deleteFromCloudinary)(currentUser.avatar);
                logger_1.default.info(`Deleted avatar for user: ${userId}`);
                // Update user (set avatar to undefined/null)
                const user = await user_service_1.default.updateProfile(userId, { avatar: '' });
                return response_1.default.success(res, 'Avatar deleted successfully', {
                    user: {
                        id: user._id,
                        email: user.email,
                        avatar: user.avatar,
                    },
                });
            }
            catch (error) {
                logger_1.default.error('Avatar deletion failed:', error);
                throw new errors_1.BadRequestError('Failed to delete avatar');
            }
        });
        /**
         * Update online status manually
         * POST /api/v1/users/online-status
         */
        this.updateOnlineStatus = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { isOnline } = req.body;
            if (typeof isOnline !== 'boolean') {
                throw new errors_1.BadRequestError('isOnline must be a boolean value');
            }
            await user_service_1.default.updateOnlineStatus(userId, isOnline);
            return response_1.default.success(res, 'Online status updated successfully', {
                isOnline,
            });
        });
        /**
         * Heartbeat endpoint to keep user online
         * POST /api/v1/users/heartbeat
         */
        this.heartbeat = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            await user_service_1.default.updateUserActivity(userId);
            return response_1.default.success(res, 'Activity updated', {
                timestamp: new Date(),
            });
        });
        /**
         * Update user location
         * PUT /api/v1/users/location
         */
        this.updateLocation = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { location } = req.body;
            const user = await user_service_1.default.updateUserLocation(userId, location);
            return response_1.default.success(res, 'Location updated successfully', {
                location: user.location,
            });
        });
        /**
        * Get nearby vendors
        * GET /api/v1/users/nearby-vendors
        */
        this.getNearbyVendors = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { latitude, longitude, maxDistance, vendorType, category, minRating } = req.query;
            if (!latitude || !longitude) {
                throw new errors_1.BadRequestError('Latitude and longitude are required');
            }
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            const maxDist = maxDistance ? parseInt(maxDistance) : 10000;
            const filters = {};
            if (vendorType)
                filters.vendorType = vendorType;
            if (category)
                filters.category = category;
            if (minRating)
                filters.minRating = parseFloat(minRating);
            const result = await user_service_1.default.getNearbyVendors(lat, lng, maxDist, filters);
            return response_1.default.success(res, 'Nearby vendors retrieved successfully', {
                vendors: result.vendors,
                total: result.total,
                query: {
                    location: { latitude: lat, longitude: lng },
                    maxDistance: maxDist,
                    filters,
                }
            });
        });
    }
}
exports.default = new UserController();
//# sourceMappingURL=user.controller.js.map