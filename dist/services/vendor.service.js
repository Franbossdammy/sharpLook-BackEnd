"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// vendor.service.ts - CORRECTED VERSION
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
class VendorService {
    /**
     * Update vendor profile
     */
    async updateVendorProfile(userId, updateData) {
        const user = await User_1.default.findById(userId).populate('vendorProfile.categories', 'name icon');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor) {
            throw new errors_1.UnauthorizedError('User is not registered as a vendor');
        }
        // Initialize vendorProfile if it doesn't exist
        if (!user.vendorProfile) {
            user.vendorProfile = {
                businessName: '',
                vendorType: types_1.VendorType.HOME_SERVICE,
            };
        }
        // Update business information
        if (updateData.businessName !== undefined) {
            user.vendorProfile.businessName = updateData.businessName;
        }
        if (updateData.businessDescription !== undefined) {
            user.vendorProfile.businessDescription = updateData.businessDescription;
        }
        // VendorType can only be set once - cannot be changed after initial setup
        if (updateData.vendorType !== undefined) {
            // Check if vendorType has already been set
            if (user.vendorProfile.vendorType && user.vendorProfile.vendorType !== updateData.vendorType) {
                throw new errors_1.BadRequestError('Vendor type cannot be changed once it has been set');
            }
            user.vendorProfile.vendorType = updateData.vendorType;
        }
        if (updateData.categories !== undefined) {
            user.vendorProfile.categories = updateData.categories;
        }
        // Update location
        if (updateData.location) {
            const { location } = updateData;
            // Validate coordinates
            const [longitude, latitude] = location.coordinates;
            if (typeof longitude !== 'number' ||
                typeof latitude !== 'number' ||
                longitude < -180 || longitude > 180 ||
                latitude < -90 || latitude > 90) {
                throw new errors_1.BadRequestError('Invalid location coordinates');
            }
            user.vendorProfile.location = {
                type: 'Point',
                coordinates: location.coordinates,
                address: location.address,
                city: location.city,
                state: location.state,
                country: location.country,
            };
        }
        if (updateData.serviceRadius !== undefined) {
            user.vendorProfile.serviceRadius = updateData.serviceRadius;
        }
        // Update availability schedule
        if (updateData.availabilitySchedule) {
            if (!user.vendorProfile.availabilitySchedule) {
                user.vendorProfile.availabilitySchedule = {
                    monday: { isAvailable: true },
                    tuesday: { isAvailable: true },
                    wednesday: { isAvailable: true },
                    thursday: { isAvailable: true },
                    friday: { isAvailable: true },
                    saturday: { isAvailable: true },
                    sunday: { isAvailable: false },
                };
            }
            Object.keys(updateData.availabilitySchedule).forEach((day) => {
                const dayKey = day;
                if (updateData.availabilitySchedule[dayKey]) {
                    user.vendorProfile.availabilitySchedule[dayKey] = updateData.availabilitySchedule[dayKey];
                }
            });
        }
        // Update documents
        if (updateData.documents) {
            if (!user.vendorProfile.documents) {
                user.vendorProfile.documents = {};
            }
            if (updateData.documents.idCard !== undefined) {
                user.vendorProfile.documents.idCard = updateData.documents.idCard;
            }
            if (updateData.documents.businessLicense !== undefined) {
                user.vendorProfile.documents.businessLicense = updateData.documents.businessLicense;
            }
            if (updateData.documents.certification !== undefined) {
                user.vendorProfile.documents.certification = updateData.documents.certification;
            }
        }
        // Update last seen
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`Vendor profile updated: ${user.email}`);
        return user;
    }
    /**
     * Get vendor profile
     */
    async getVendorProfile(userId) {
        const user = await User_1.default.findById(userId)
            .populate('vendorProfile.categories', 'name icon')
            .select('-password -refreshToken');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor) {
            throw new errors_1.UnauthorizedError('User is not registered as a vendor');
        }
        return user;
    }
    /**
     * Update vendor availability schedule
     */
    async updateAvailabilitySchedule(userId, schedule) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor || !user.vendorProfile) {
            throw new errors_1.UnauthorizedError('User is not registered as a vendor');
        }
        if (!user.vendorProfile.availabilitySchedule) {
            user.vendorProfile.availabilitySchedule = {
                monday: { isAvailable: true },
                tuesday: { isAvailable: true },
                wednesday: { isAvailable: true },
                thursday: { isAvailable: true },
                friday: { isAvailable: true },
                saturday: { isAvailable: true },
                sunday: { isAvailable: false },
            };
        }
        if (schedule) {
            Object.keys(schedule).forEach((day) => {
                const dayKey = day;
                if (schedule[dayKey]) {
                    user.vendorProfile.availabilitySchedule[dayKey] = schedule[dayKey];
                }
            });
        }
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`Vendor availability updated: ${user.email}`);
        return user;
    }
    /**
     * Upload vendor document
     */
    async uploadDocument(userId, documentType, documentUrl) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor || !user.vendorProfile) {
            throw new errors_1.UnauthorizedError('User is not registered as a vendor');
        }
        if (!user.vendorProfile.documents) {
            user.vendorProfile.documents = {};
        }
        if (documentType === 'certification') {
            if (!user.vendorProfile.documents.certification) {
                user.vendorProfile.documents.certification = [];
            }
            user.vendorProfile.documents.certification.push(documentUrl);
        }
        else {
            user.vendorProfile.documents[documentType] = documentUrl;
        }
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`Vendor document uploaded: ${user.email} - ${documentType}`);
        return user;
    }
    /**
     * Update vendor location
     */
    async updateLocation(userId, location, serviceRadius) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor || !user.vendorProfile) {
            throw new errors_1.UnauthorizedError('User is not registered as a vendor');
        }
        // Validate coordinates
        const [longitude, latitude] = location.coordinates;
        if (typeof longitude !== 'number' ||
            typeof latitude !== 'number' ||
            longitude < -180 || longitude > 180 ||
            latitude < -90 || latitude > 90) {
            throw new errors_1.BadRequestError('Invalid location coordinates');
        }
        user.vendorProfile.location = {
            type: 'Point',
            coordinates: location.coordinates,
            address: location.address,
            city: location.city,
            state: location.state,
            country: location.country,
        };
        if (serviceRadius !== undefined) {
            user.vendorProfile.serviceRadius = serviceRadius;
        }
        user.lastSeen = new Date();
        await user.save();
        logger_1.default.info(`Vendor location updated: ${user.email}`);
        return user;
    }
    /**
     * Check if vendor profile is complete
     */
    async checkProfileCompletion(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (!user.isVendor) {
            throw new errors_1.UnauthorizedError('User is not registered as a vendor');
        }
        const isComplete = user.isProfileComplete();
        const percentage = user.getProfileCompletionPercentage();
        const missingFields = user.getMissingFields();
        return {
            isComplete,
            percentage,
            missingFields,
        };
    }
}
exports.default = new VendorService();
//# sourceMappingURL=vendor.service.js.map