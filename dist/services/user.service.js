"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const types_1 = require("../types");
const mongoose_1 = __importDefault(require("mongoose"));
class UserService {
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await User_1.default.findById(userId).populate('referredBy', 'firstName lastName email');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        return user;
    }
    /**
     * Get user profile - with online status update
     */
    async getProfile(userId) {
        const user = await User_1.default.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }, { new: true })
            .select('+withdrawalPin')
            .populate('referredBy', 'firstName lastName email');
        // ✅ NO .lean() - keeps it as Mongoose document
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        logger_1.default.info(`User online status updated: ${user.email}`);
        // ✅ Just add hasWithdrawalPin - everything else stays intact
        user.hasWithdrawalPin = !!user.withdrawalPin;
        return user;
    }
    /**
     * Update user online status
     */
    async updateOnlineStatus(userId, isOnline) {
        await User_1.default.findByIdAndUpdate(userId, {
            isOnline,
            lastSeen: new Date(),
        });
        logger_1.default.info(`User ${userId} online status: ${isOnline}`);
    }
    /**
     * Set user offline
     */
    async setUserOffline(userId) {
        await User_1.default.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
        });
        logger_1.default.info(`User ${userId} set to offline`);
    }
    /**
     * Update user activity (heartbeat)
     */
    async updateUserActivity(userId) {
        await User_1.default.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date(),
        });
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Check if phone is being updated and is unique
        if (updates.phone && updates.phone !== user.phone) {
            const existingPhone = await User_1.default.findOne({ phone: updates.phone });
            if (existingPhone) {
                throw new errors_1.ConflictError('Phone number already in use');
            }
            user.isPhoneVerified = false; // Reset phone verification
        }
        // Update fields
        Object.assign(user, updates);
        // Update activity
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`User profile updated: ${user.email}`);
        return user;
    }
    /**
     * Update user preferences
     */
    async updatePreferences(userId, preferences) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Initialize preferences if not exists
        if (!user.preferences) {
            user.preferences = {
                darkMode: false,
                fingerprintEnabled: false,
                notificationsEnabled: true,
                emailNotifications: true,
                pushNotifications: true,
                bookingUpdates: true,
                newMessages: true,
                paymentAlerts: true,
                reminderNotifications: true,
                promotions: false,
            };
        }
        // Update preferences using spread operator
        user.preferences = {
            ...user.preferences,
            ...preferences,
        };
        // Mark as modified for Mongoose
        user.markModified('preferences');
        // Update activity
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`User preferences updated: ${user.email}`);
        return user;
    }
    // UPDATE THESE METHODS IN YOUR user.service.ts FILE
    /**
     * Set withdrawal PIN
     */
    async setWithdrawalPin(userId, pin) {
        if (!/^\d{4,6}$/.test(pin)) {
            throw new errors_1.BadRequestError('PIN must be 4-6 digits');
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // ✅ Check if user already has a PIN
        if (user.withdrawalPin) {
            throw new errors_1.BadRequestError('Withdrawal PIN already set. Use change PIN endpoint to update.');
        }
        user.withdrawalPin = pin; // Will be hashed by pre-save hook
        await user.save();
        logger_1.default.info(`Withdrawal PIN set: ${user.email}`);
    }
    /**
     * Change withdrawal PIN (NEW METHOD - ADD THIS)
     */
    async changeWithdrawalPin(userId, currentPin, newPin) {
        if (!/^\d{4,6}$/.test(newPin)) {
            throw new errors_1.BadRequestError('New PIN must be 4-6 digits');
        }
        const user = await User_1.default.findById(userId).select('+withdrawalPin');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.withdrawalPin) {
            throw new errors_1.BadRequestError('No withdrawal PIN set. Please set a PIN first.');
        }
        // ✅ Verify current PIN
        const bcrypt = require('bcryptjs');
        const isValidCurrentPin = await bcrypt.compare(currentPin, user.withdrawalPin);
        if (!isValidCurrentPin) {
            throw new errors_1.BadRequestError('Current PIN is incorrect');
        }
        // ✅ Check new PIN is different from current
        const isSameAsOld = await bcrypt.compare(newPin, user.withdrawalPin);
        if (isSameAsOld) {
            throw new errors_1.BadRequestError('New PIN must be different from current PIN');
        }
        // ✅ Update to new PIN
        user.withdrawalPin = newPin; // Will be hashed by pre-save hook
        await user.save();
        logger_1.default.info(`Withdrawal PIN changed: ${user.email}`);
    }
    /**
     * Verify withdrawal PIN
     */
    async verifyWithdrawalPin(userId, pin) {
        const user = await User_1.default.findById(userId).select('+withdrawalPin');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.withdrawalPin) {
            throw new errors_1.BadRequestError('Withdrawal PIN not set');
        }
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(pin, user.withdrawalPin);
    }
    /**
     * Register as vendor or update vendor profile
     */
    async becomeVendor(userId, vendorData) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Convert category strings to ObjectIds
        const categoryIds = vendorData.categories
            ? vendorData.categories.map((id) => mongoose_1.default.Types.ObjectId.createFromHexString(id))
            : [];
        // Initialize vendor profile
        user.isVendor = true;
        user.vendorProfile = {
            businessName: vendorData.businessName,
            vendorType: vendorData.vendorType,
            categories: categoryIds,
            rating: 0,
            totalRatings: 0,
            completedBookings: 0,
            isVerified: false,
            availabilitySchedule: {
                monday: { isAvailable: true, from: '09:00', to: '17:00' },
                tuesday: { isAvailable: true, from: '09:00', to: '17:00' },
                wednesday: { isAvailable: true, from: '09:00', to: '17:00' },
                thursday: { isAvailable: true, from: '09:00', to: '17:00' },
                friday: { isAvailable: true, from: '09:00', to: '17:00' },
                saturday: { isAvailable: true, from: '09:00', to: '17:00' },
                sunday: { isAvailable: false },
            },
        };
        // Add optional fields if provided
        if (vendorData.businessDescription) {
            user.vendorProfile.businessDescription = vendorData.businessDescription;
        }
        if (vendorData.location) {
            user.vendorProfile.location = {
                type: 'Point',
                coordinates: vendorData.location.coordinates,
                address: vendorData.location.address,
                city: vendorData.location.city,
                state: vendorData.location.state,
                country: vendorData.location.country,
            };
        }
        if (vendorData.serviceRadius !== undefined) {
            user.vendorProfile.serviceRadius = vendorData.serviceRadius;
        }
        if (vendorData.documents) {
            user.vendorProfile.documents = vendorData.documents;
        }
        await user.save();
        logger_1.default.info(`User became vendor: ${user.email}`);
        return user;
    }
    /**
     * Update vendor profile
     */
    async updateVendorProfile(userId, updates) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor || !user.vendorProfile) {
            throw new errors_1.BadRequestError('User is not a vendor');
        }
        // Update vendor profile
        Object.assign(user.vendorProfile, updates);
        await user.save();
        logger_1.default.info(`Vendor profile updated: ${user.email}`);
        return user;
    }
    /**
     * Get all users (admin)
     */
    async getAllUsers(page = 1, limit = 10, filters) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query
        const query = {};
        if (filters?.role) {
            query.role = filters.role;
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.isVendor !== undefined) {
            query.isVendor = filters.isVendor;
        }
        if (filters?.search) {
            query.$or = [
                { firstName: { $regex: filters.search, $options: 'i' } },
                { lastName: { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } },
                { phone: { $regex: filters.search, $options: 'i' } },
            ];
        }
        const [users, total] = await Promise.all([
            User_1.default.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            User_1.default.countDocuments(query),
        ]);
        return {
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get vendors with filters and location
     */
    async getVendors(filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query
        const query = {
            isVendor: true,
            'vendorProfile.isVerified': true,
        };
        if (filters?.vendorType) {
            query['vendorProfile.vendorType'] = filters.vendorType;
        }
        if (filters?.category) {
            query['vendorProfile.categories'] = mongoose_1.default.Types.ObjectId.createFromHexString(filters.category);
        }
        if (filters?.rating) {
            query['vendorProfile.rating'] = { $gte: filters.rating };
        }
        if (filters?.search) {
            query.$or = [
                { 'vendorProfile.businessName': { $regex: filters.search, $options: 'i' } },
                { 'vendorProfile.businessDescription': { $regex: filters.search, $options: 'i' } },
            ];
        }
        let vendors;
        // Location-based search
        if (filters?.location) {
            const maxDistance = (filters.location.maxDistance || 10) * 1000;
            vendors = await User_1.default.find({
                ...query,
                'vendorProfile.location': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [filters.location.longitude, filters.location.latitude],
                        },
                        $maxDistance: maxDistance,
                    },
                },
            })
                .skip(skip)
                .limit(limit)
                .populate('vendorProfile.categories', 'name icon');
        }
        else {
            vendors = await User_1.default.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ 'vendorProfile.rating': -1, 'vendorProfile.completedBookings': -1 })
                .populate('vendorProfile.categories', 'name icon');
        }
        const total = await User_1.default.countDocuments(query);
        return {
            vendors,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getTopVendors(limit = 10, filters) {
        // Build query
        const query = {
            isVendor: true,
            'vendorProfile.isVerified': true,
            'vendorProfile.rating': { $gt: 0 },
        };
        if (filters?.vendorType) {
            query['vendorProfile.vendorType'] = filters.vendorType;
        }
        if (filters?.category) {
            query['vendorProfile.categories'] = mongoose_1.default.Types.ObjectId.createFromHexString(filters.category);
        }
        if (filters?.minRating) {
            query['vendorProfile.rating'] = { $gte: filters.minRating };
        }
        const vendors = await User_1.default.find(query)
            .select('firstName lastName avatar isOnline vendorProfile.businessName vendorProfile.businessDescription vendorProfile.rating vendorProfile.totalRatings vendorProfile.completedBookings vendorProfile.vendorType vendorProfile.location vendorProfile.categories vendorProfile.serviceRadius')
            .populate('vendorProfile.categories', 'name icon slug')
            .sort({
            'vendorProfile.rating': -1,
            'vendorProfile.totalRatings': -1,
            'vendorProfile.completedBookings': -1,
        })
            .limit(limit)
            .lean();
        logger_1.default.info(`Retrieved ${vendors.length} top vendors`);
        return vendors;
    }
    async getVendorFullDetails(vendorId, options) {
        const { includeServices = true, includeReviews = true, reviewsLimit = 10, } = options || {};
        const vendor = await User_1.default.findById(vendorId)
            .populate('vendorProfile.categories', 'name icon slug description')
            .lean();
        if (!vendor) {
            throw new errors_1.NotFoundError('Vendor not found');
        }
        if (!vendor.isVendor || !vendor.vendorProfile) {
            throw new errors_1.BadRequestError('User is not a vendor');
        }
        const response = {
            vendor,
            stats: {
                totalServices: 0,
                activeServices: 0,
                totalReviews: vendor.vendorProfile.totalRatings || 0,
                averageRating: vendor.vendorProfile.rating || 0,
                completedBookings: vendor.vendorProfile.completedBookings || 0,
                responseRate: 95,
            },
        };
        if (includeServices) {
            const Service = require('../models/Service').default;
            const services = await Service.find({ vendor: vendorId })
                .populate('category', 'name icon')
                .sort({ createdAt: -1 })
                .lean();
            response.services = services;
            response.stats.totalServices = services.length;
            response.stats.activeServices = services.filter((s) => s.isActive !== false).length;
        }
        if (includeReviews) {
            const Review = require('../models/Review').default;
            const reviews = await Review.find({
                reviewee: vendorId,
                isApproved: true,
                isHidden: false
            })
                .populate('reviewer', 'firstName lastName avatar')
                .populate('booking', 'bookingNumber service scheduledDate')
                .sort({ createdAt: -1 })
                .limit(reviewsLimit)
                .lean();
            response.reviews = reviews;
            response.stats.totalReviews = reviews.length;
        }
        logger_1.default.info(`Retrieved full details for vendor: ${vendorId}`);
        return response;
    }
    /**
     * Update user status (admin)
     */
    async updateUserStatus(userId, status) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        user.status = status;
        await user.save();
        logger_1.default.info(`User status updated: ${user.email} - ${status}`);
        return user;
    }
    /**
     * Verify vendor (admin)
     */
    async verifyVendor(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor || !user.vendorProfile) {
            throw new errors_1.BadRequestError('User is not a vendor');
        }
        user.vendorProfile.isVerified = true;
        user.vendorProfile.verificationDate = new Date();
        await user.save();
        logger_1.default.info(`Vendor verified: ${user.email}`);
        return user;
    }
    /**
     * Soft delete user
     */
    async softDeleteUser(userId, deletedBy) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        user.isDeleted = true;
        user.deletedAt = new Date();
        user.deletedBy = mongoose_1.default.Types.ObjectId.createFromHexString(deletedBy);
        user.status = types_1.UserStatus.INACTIVE;
        user.refreshToken = undefined;
        user.isOnline = false; // Set offline when deleted
        await user.save();
        logger_1.default.info(`User soft deleted: ${user.email}`);
    }
    /**
     * Restore deleted user
     */
    async restoreUser(userId) {
        const user = await User_1.default.findOne({ _id: userId, isDeleted: true });
        if (!user) {
            throw new errors_1.NotFoundError('Deleted user not found');
        }
        user.isDeleted = false;
        user.deletedAt = undefined;
        user.deletedBy = undefined;
        user.status = types_1.UserStatus.ACTIVE;
        await user.save();
        logger_1.default.info(`User restored: ${user.email}`);
        return user;
    }
    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        const stats = {
            joinedDate: user.createdAt,
            lastLogin: user.lastLogin,
            lastSeen: user.lastSeen,
            isOnline: user.isOnline,
            emailVerified: user.isEmailVerified,
            phoneVerified: user.isPhoneVerified,
        };
        if (user.isVendor && user.vendorProfile) {
            stats.vendorStats = {
                rating: user.vendorProfile.rating,
                totalRatings: user.vendorProfile.totalRatings,
                completedBookings: user.vendorProfile.completedBookings,
                isVerified: user.vendorProfile.isVerified,
            };
        }
        return stats;
    }
    /**
   * Update user location
   */
    async updateUserLocation(userId, location) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Validate coordinates
        const [longitude, latitude] = location.coordinates;
        if (typeof longitude !== 'number' ||
            typeof latitude !== 'number' ||
            longitude < -180 || longitude > 180 ||
            latitude < -90 || latitude > 90) {
            throw new errors_1.BadRequestError('Invalid coordinates');
        }
        // Update user location
        user.location = {
            type: location.type,
            coordinates: location.coordinates,
            address: location.address,
            city: location.city,
            state: location.state,
            country: location.country,
        };
        // Update activity
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`User location updated: ${user.email}`);
        return user;
    }
    /**
     * Get nearby vendors based on user location
     */
    async getNearbyVendors(latitude, longitude, maxDistance = 10000, // meters
    filters) {
        // Build query
        const query = {
            isVendor: true,
            'vendorProfile.isVerified': true,
            'vendorProfile.location': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: maxDistance
                }
            }
        };
        if (filters?.vendorType) {
            query['vendorProfile.vendorType'] = filters.vendorType;
        }
        if (filters?.category) {
            query['vendorProfile.categories'] = mongoose_1.default.Types.ObjectId.createFromHexString(filters.category);
        }
        if (filters?.minRating) {
            query['vendorProfile.rating'] = { $gte: filters.minRating };
        }
        // Find nearby vendors
        const vendors = await User_1.default.find(query)
            .select('firstName lastName email phone avatar vendorProfile isOnline lastSeen')
            .populate('vendorProfile.categories', 'name icon')
            .limit(50);
        // Calculate distance for each vendor
        const vendorsWithDistance = vendors.map(vendor => {
            const vendorObj = vendor.toObject();
            if (vendor.vendorProfile?.location?.coordinates) {
                const [vLng, vLat] = vendor.vendorProfile.location.coordinates;
                const distance = this.calculateDistance(latitude, longitude, vLat, vLng);
                return {
                    ...vendorObj,
                    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
                };
            }
            return vendorObj;
        });
        logger_1.default.info(`Found ${vendorsWithDistance.length} nearby vendors`);
        return {
            vendors: vendorsWithDistance,
            total: vendorsWithDistance.length,
        };
    }
    /**
    * Calculate distance between two coordinates (Haversine formula)
    */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}
exports.default = new UserService();
//# sourceMappingURL=user.service.js.map