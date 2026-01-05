// vendor.service.ts - CORRECTED VERSION
import User, { IUser } from '../models/User';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../utils/errors';
import { VendorType } from '../types';
import logger from '../utils/logger';

interface UpdateVendorProfileData {
  // Business Information
  businessName?: string;
  businessDescription?: string;
  vendorType?: VendorType;
  categories?: string[];
  
  // Location
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
    city: string;
    state: string;
    country: string;
  };
  serviceRadius?: number;
  
  // Availability Schedule
  availabilitySchedule?: {
    monday?: { isAvailable: boolean; from?: string; to?: string };
    tuesday?: { isAvailable: boolean; from?: string; to?: string };
    wednesday?: { isAvailable: boolean; from?: string; to?: string };
    thursday?: { isAvailable: boolean; from?: string; to?: string };
    friday?: { isAvailable: boolean; from?: string; to?: string };
    saturday?: { isAvailable: boolean; from?: string; to?: string };
    sunday?: { isAvailable: boolean; from?: string; to?: string };
  };
  
  // Documents
  documents?: {
    idCard?: string;
    businessLicense?: string;
    certification?: string[];
  };
}

class VendorService {
  /**
   * Update vendor profile
   */
  public async updateVendorProfile(
    userId: string,
    updateData: UpdateVendorProfileData
  ): Promise<IUser> {
    const user = await User.findById(userId).populate('vendorProfile.categories', 'name icon');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor) {
      throw new UnauthorizedError('User is not registered as a vendor');
    }

    // Initialize vendorProfile if it doesn't exist
    if (!user.vendorProfile) {
      user.vendorProfile = {
        businessName: '',
        vendorType: VendorType.HOME_SERVICE,
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
        throw new BadRequestError('Vendor type cannot be changed once it has been set');
      }
      user.vendorProfile.vendorType = updateData.vendorType;
    }

    if (updateData.categories !== undefined) {
      user.vendorProfile.categories = updateData.categories as any;
    }

    // Update location
    if (updateData.location) {
      const { location } = updateData;
      
      // Validate coordinates
      const [longitude, latitude] = location.coordinates;
      if (
        typeof longitude !== 'number' ||
        typeof latitude !== 'number' ||
        longitude < -180 || longitude > 180 ||
        latitude < -90 || latitude > 90
      ) {
        throw new BadRequestError('Invalid location coordinates');
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
        const dayKey = day as keyof typeof updateData.availabilitySchedule;
        if (updateData.availabilitySchedule![dayKey]) {
          user.vendorProfile!.availabilitySchedule![dayKey] = updateData.availabilitySchedule![dayKey]!;
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

    logger.info(`Vendor profile updated: ${user.email}`);

    return user;
  }

  /**
   * Get vendor profile
   */
  public async getVendorProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId)
      .populate('vendorProfile.categories', 'name icon')
      .select('-password -refreshToken');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor) {
      throw new UnauthorizedError('User is not registered as a vendor');
    }

    return user;
  }

  /**
   * Update vendor availability schedule
   */
  public async updateAvailabilitySchedule(
    userId: string,
    schedule: UpdateVendorProfileData['availabilitySchedule']
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor || !user.vendorProfile) {
      throw new UnauthorizedError('User is not registered as a vendor');
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
        const dayKey = day as keyof typeof schedule;
        if (schedule[dayKey]) {
          user.vendorProfile!.availabilitySchedule![dayKey] = schedule[dayKey]!;
        }
      });
    }

    user.lastSeen = new Date();
    await user.save();

    logger.info(`Vendor availability updated: ${user.email}`);

    return user;
  }

  /**
   * Upload vendor document
   */
  public async uploadDocument(
    userId: string,
    documentType: 'idCard' | 'businessLicense' | 'certification',
    documentUrl: string
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor || !user.vendorProfile) {
      throw new UnauthorizedError('User is not registered as a vendor');
    }

    if (!user.vendorProfile.documents) {
      user.vendorProfile.documents = {};
    }

    if (documentType === 'certification') {
      if (!user.vendorProfile.documents.certification) {
        user.vendorProfile.documents.certification = [];
      }
      user.vendorProfile.documents.certification.push(documentUrl);
    } else {
      user.vendorProfile.documents[documentType] = documentUrl;
    }

    user.lastSeen = new Date();
    await user.save();

    logger.info(`Vendor document uploaded: ${user.email} - ${documentType}`);

    return user;
  }

  /**
   * Update vendor location
   */
  public async updateLocation(
    userId: string,
    location: {
      type: 'Point';
      coordinates: [number, number];
      address: string;
      city: string;
      state: string;
      country: string;
    },
    serviceRadius?: number
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor || !user.vendorProfile) {
      throw new UnauthorizedError('User is not registered as a vendor');
    }

    // Validate coordinates
    const [longitude, latitude] = location.coordinates;
    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      longitude < -180 || longitude > 180 ||
      latitude < -90 || latitude > 90
    ) {
      throw new BadRequestError('Invalid location coordinates');
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

    logger.info(`Vendor location updated: ${user.email}`);

    return user;
  }

  /**
   * Check if vendor profile is complete
   */
  public async checkProfileCompletion(userId: string): Promise<{
    isComplete: boolean;
    percentage: number;
    missingFields: string[];
  }> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVendor) {
      throw new UnauthorizedError('User is not registered as a vendor');
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

export default new VendorService();