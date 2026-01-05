import Service, { IService } from '../models/Service';
import Review, { IReview } from '../models/Review';
import User from '../models/User';
import Category from '../models/Category';
import subscriptionService from './subscription.service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors';
import { slugify, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

class ServiceService {
public async createService(
  vendorId: string,
  data: {
    name: string;
    description: string;
    category: string;
    subCategory?: string;
    basePrice: number;
    priceType?: 'fixed' | 'hourly' | 'negotiable';
    duration?: number;
    images?: string[];
    tags?: string[];
    requirements?: string[];
    whatIsIncluded?: string[];
    faqs?: { question: string; answer: string }[];
    availability?: any;
  }
): Promise<IService> {
  // ============================================================
  // STEP 1: Verify vendor exists and is a vendor
  // ============================================================
  const vendor = await User.findById(vendorId);
  if (!vendor || !vendor.isVendor) {
    throw new UnauthorizedError('Only vendors can create services');
  }

  // ============================================================
  // STEP 2: Check if vendor profile is complete
  // ============================================================
  if (!vendor.vendorProfile) {
    throw new ForbiddenError(
      'Please complete your vendor profile before creating services. ' +
      'Go to Profile > Edit Profile to set up your business details.'
    );
  }

  // ============================================================
  // STEP 2.5: ✅ CHECK IF VENDOR TYPE IS SET
  // ============================================================
  if (!vendor.vendorProfile.vendorType) {
    throw new ForbiddenError(
      'Please set your vendor type in your profile before creating services. ' +
      'Go to Profile > Edit Profile and select whether you offer In-Shop, Home Service, or Both.'
    );
  }

  const vendorType = vendor.vendorProfile.vendorType;
  
  // Validate vendorType
  if (!['in_shop', 'home_service', 'both'].includes(vendorType)) {
    throw new BadRequestError(
      'Invalid vendor type in your profile. Please update your profile with a valid vendor type: in_shop, home_service, or both.'
    );
  }

  // ============================================================
  // STEP 3: Check if vendor profile is verified
  // ============================================================
  if (!vendor.vendorProfile?.isVerified) {
    throw new ForbiddenError('Vendor account must be verified to create services');
  }

  // ============================================================
  // STEP 4: ✅ CHECK SUBSCRIPTION BASED ON VENDOR TYPE
  // ============================================================
  if (vendorType === 'in_shop' || vendorType === 'both') {
    // In-shop and "both" vendors MUST have active subscription
    const subscription = await subscriptionService.getVendorSubscription(vendorId);
    
    // Check if subscription exists
    if (!subscription) {
      throw new ForbiddenError(
        `${vendorType === 'in_shop' ? 'In-Shop' : 'Hybrid'} vendors must subscribe to create services. ` +
        `Please visit the Subscription page and choose the ${
          vendorType === 'in_shop' 
            ? 'In-Shop Plan (₦5,000/month, 0% commission)' 
            : 'Hybrid Plan (0% monthly fee, 12% commission per booking)'
        }.`
      );
    }
    
    // Check if subscription is active
    if (subscription.status !== 'active') {
      throw new ForbiddenError(
        `Your subscription is ${subscription.status}. ` +
        `Please ${
          subscription.status === 'pending' 
            ? 'complete payment to activate' 
            : subscription.status === 'expired'
            ? 'renew'
            : 'activate'
        } your subscription to create services.`
      );
    }
    
    // Verify subscription type matches vendor type
    const validSubscriptionTypes = 
      vendorType === 'in_shop' ? ['in_shop'] : ['both'];
    
    if (!validSubscriptionTypes.includes(subscription.type)) {
      throw new ForbiddenError(
        `Subscription mismatch: Your vendor type is "${vendorType}" but your subscription is "${subscription.type}". ` +
        `Please update your subscription to match your vendor type.`
      );
    }
    
    logger.info(
      `✅ Subscription verified for ${vendorType} vendor ${vendorId}: ${subscription.type} (${subscription.status})`
    );
  } else if (vendorType === 'home_service') {
    // Home service vendors don't need subscription
    // They pay 10% commission per booking
    logger.info(
      `✅ Home service vendor ${vendorId} - No subscription required (10% commission per booking)`
    );
  }

  // ============================================================
  // STEP 5: Verify category exists
  // ============================================================
  const category = await Category.findById(data.category);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // ============================================================
  // STEP 6: Verify subcategory if provided
  // ============================================================
  if (data.subCategory) {
    const subCategory = await Category.findById(data.subCategory);
    if (!subCategory) {
      throw new NotFoundError('Subcategory not found');
    }
  }

  // ============================================================
  // STEP 7: Generate unique slug
  // ============================================================
  let slug = slugify(data.name);
  let isUnique = false;
  let counter = 1;

  while (!isUnique) {
    const count = await Service.countDocuments({ slug });
    if (count === 0) {
      isUnique = true;
    } else {
      slug = `${slugify(data.name)}-${counter}`;
      counter++;
    }
  }

  // ============================================================
  // STEP 8: ✅ Create the service (use vendorType from profile)
  // ============================================================
  const service = await Service.create({
    vendor: vendorId,
    ...data,
    slug,
    vendorType: vendorType, // ✅ Use vendorType from vendor profile
    isActive: false, // Services start inactive
    approvalStatus: 'pending', // Must be approved by admin
  });

  logger.info(
    `✅ Service created: "${service.name}" (ID: ${service._id}) ` +
    `by ${vendorType} vendor ${vendorId} - Pending admin approval`
  );

  // ============================================================
  // STEP 9: Return the created service
  // ============================================================
  return service;
}
  /**
   * Get all services with filters
   */
  public async getAllServices(
    filters?: {
      vendor?: string;
      category?: string;
      subCategory?: string;
      priceMin?: number;
      priceMax?: number;
      rating?: number;
      search?: string;
      isActive?: boolean;
      approvalStatus?: 'pending' | 'approved' | 'rejected';
      location?: {
        latitude: number;
        longitude: number;
        maxDistance?: number;
      };
    },
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ services: IService[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Build query
    const query: any = {};

    // For public-facing queries (no vendor or approval status filter), only show approved and active
    if (!filters?.approvalStatus && !filters?.vendor) {
      query.isActive = true;
      query.approvalStatus = 'approved';
    } else {
      // For admin or vendor queries, allow filtering
      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters?.approvalStatus) {
        query.approvalStatus = filters.approvalStatus;
      }
    }

    if (filters?.vendor) {
      query.vendor = filters.vendor;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.subCategory) {
      query.subCategory = filters.subCategory;
    }

    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      query.basePrice = {};
      if (filters.priceMin !== undefined) {
        query.basePrice.$gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        query.basePrice.$lte = filters.priceMax;
      }
    }

    if (filters?.rating) {
      query['metadata.averageRating'] = { $gte: filters.rating };
    }

    if (filters?.search) {
      query.$text = { $search: filters.search };
    }

    // Location-based filter
    let vendorIds: string[] | undefined;
    if (filters?.location) {
      const maxDistance = (filters.location.maxDistance || 10) * 1000; // Convert km to meters

      const nearbyVendors = await User.find({
        isVendor: true,
        'vendorProfile.isVerified': true,
        'vendorProfile.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [filters.location.longitude, filters.location.latitude],
            },
            $maxDistance: maxDistance,
          },
        },
      }).select('_id');

      vendorIds = nearbyVendors.map((v) => v._id.toString());
      
      if (vendorIds.length > 0) {
        query.vendor = { $in: vendorIds };
      } else {
        // No vendors in range, return empty result
        return { services: [], total: 0, page, totalPages: 0 };
      }
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [services, total] = await Promise.all([
      Service.find(query)
        .populate('vendor', 'firstName lastName email vendorProfile.businessName vendorProfile.rating')
        .populate('category', 'name slug icon')
        .populate('subCategory', 'name slug icon')
        .skip(skip)
        .limit(limit)
        .sort(sort),
      Service.countDocuments(query),
    ]);

    return {
      services,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get service by ID
   */
  public async getServiceById(serviceId: string, incrementView: boolean = false): Promise<IService> {
    const service = await Service.findById(serviceId)
      .populate('vendor', 'firstName lastName email vendorProfile')
      .populate('category', 'name slug icon')
      .populate('subCategory', 'name slug icon');

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Increment view count if requested
    if (incrementView) {
      if (!service.metadata) {
        service.metadata = {
          views: 0,
          bookings: 0,
          completedBookings: 0,
          averageRating: 0,
          totalReviews: 0,
        };
      }
      service.metadata.views = (service.metadata.views || 0) + 1;
      await service.save();
    }

    return service;
  }

  /**
   * Get service by slug
   */
  public async getServiceBySlug(slug: string, incrementView: boolean = false): Promise<IService> {
    const service = await Service.findOne({ slug })
      .populate('vendor', 'firstName lastName email vendorProfile')
      .populate('category', 'name slug icon')
      .populate('subCategory', 'name slug icon');

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (incrementView) {
      if (!service.metadata) {
        service.metadata = {
          views: 0,
          bookings: 0,
          completedBookings: 0,
          averageRating: 0,
          totalReviews: 0,
        };
      }
      service.metadata.views = (service.metadata.views || 0) + 1;
      await service.save();
    }

    return service;
  }

  /**
   * Update service
   */
  public async updateService(
    serviceId: string,
    vendorId: string,
    updates: Partial<IService>
  ): Promise<IService> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check ownership
    if (service.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only update your own services');
    }

    // Update slug if name changes
    if (updates.name && updates.name !== service.name) {
      let slug = slugify(updates.name);
      let isUnique = false;
      let counter = 1;

      while (!isUnique) {
        // Use countDocuments to bypass the pre-find hook and check ALL services (including deleted)
        const count = await Service.countDocuments({ 
          slug, 
          _id: { $ne: serviceId } 
        });
        if (count === 0) {
          isUnique = true;
        } else {
          slug = `${slugify(updates.name)}-${counter}`;
          counter++;
        }
      }
      service.slug = slug;
    }

    // Verify category if being updated
    if (updates.category) {
      const category = await Category.findById(updates.category);
      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    // If service was previously approved and significant changes are made, reset to pending
    const significantFields = ['name', 'description', 'category', 'basePrice', 'images'];
    const hasSignificantChanges = Object.keys(updates).some(key => significantFields.includes(key));
    
    if (hasSignificantChanges && service.approvalStatus === 'approved') {
      service.approvalStatus = 'pending';
      service.isActive = false;
      logger.info(`Service ${service.name} reset to pending approval due to significant changes`);
    }

    // Update fields
    Object.assign(service, updates);
    await service.save();

    logger.info(`Service updated: ${service.name}`);

    return service;
  }

  /**
   * Delete service (soft delete)
   */
  public async deleteService(serviceId: string, vendorId: string): Promise<void> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check ownership
    if (service.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only delete your own services');
    }

    service.isDeleted = true;
    service.deletedAt = new Date();
    service.isActive = false;
    await service.save();

    logger.info(`Service deleted: ${service.name}`);
  }

  /**
   * Toggle service active status
   */
  public async toggleServiceStatus(serviceId: string, vendorId: string): Promise<IService> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check ownership
    if (service.vendor.toString() !== vendorId) {
      throw new ForbiddenError('You can only update your own services');
    }

    // Only allow toggling if service is approved
    if (service.approvalStatus !== 'approved') {
      throw new BadRequestError('Service must be approved before it can be activated');
    }

    service.isActive = !service.isActive;
    await service.save();

    logger.info(`Service status toggled: ${service.name} - ${service.isActive}`);

    return service;
  }

  /**
   * Get vendor services
   */
  public async getVendorServices(
    vendorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ services: IService[]; total: number; page: number; totalPages: number }> {
    // Pass all required parameters
    return this.getAllServices({ vendor: vendorId }, page, limit, 'createdAt', 'desc');
  }

  /**
   * ADMIN: Approve a service
   */
  public async approveService(
    serviceId: string,
    adminId: string,
    notes?: string
  ): Promise<IService> {
    // Verify admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only admins can approve services');
    }

    const service = await Service.findById(serviceId)
      .populate('vendor', 'firstName lastName email');

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (service.approvalStatus === 'approved') {
      throw new BadRequestError('Service is already approved');
    }

    service.approvalStatus = 'approved';
    service.isActive = true;
    service.approvedBy = admin._id;
    service.approvedAt = new Date();
    if (notes) {
      service.approvalNotes = notes;
    }

    await service.save();

    logger.info(`Service approved: ${service.name} by admin ${adminId}`);

    // TODO: Send notification to vendor about approval
    // await NotificationService.sendServiceApprovalNotification(service.vendor, service);

    return service;
  }

  /**
   * ADMIN: Reject a service
   */
  public async rejectService(
    serviceId: string,
    adminId: string,
    reason: string
  ): Promise<IService> {
    // Verify admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedError('Only admins can reject services');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestError('Rejection reason is required');
    }

    const service = await Service.findById(serviceId)
      .populate('vendor', 'firstName lastName email');

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    service.approvalStatus = 'rejected';
    service.isActive = false;
    service.rejectedBy = admin._id;
    service.rejectedAt = new Date();
    service.rejectionReason = reason;

    await service.save();

    logger.info(`Service rejected: ${service.name} by admin ${adminId} - Reason: ${reason}`);

    // TODO: Send notification to vendor about rejection
    // await NotificationService.sendServiceRejectionNotification(service.vendor, service, reason);

    return service;
  }


/**
 * Search vendors by business name, services, or category
 */
public async searchVendors(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ vendors: any[]; total: number; page: number; totalPages: number }> {
  if (!query || query.trim().length === 0) {
    throw new BadRequestError('Search query is required');
  }

  const { skip } = parsePaginationParams(page, limit);

  // Create search regex for flexible matching
  const searchRegex = new RegExp(query.trim(), 'i');

  // Step 1: Find matching services
  const matchingServices = await Service.find({
    isActive: true,
    approvalStatus: 'approved',
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
    ],
  }).select('vendor');

  // Get unique vendor IDs from matching services
  const vendorIdsFromServices = [...new Set(matchingServices.map(s => s.vendor.toString()))];

  // Step 2: Find vendors that match either:
  // - Business name matches search query
  // - OR they have matching services
  const vendorQuery: any = {
    isVendor: true,
    'vendorProfile.isVerified': true,
    $or: [
      { 'vendorProfile.businessName': searchRegex },
      { _id: { $in: vendorIdsFromServices } },
    ],
  };

  const [vendors, total] = await Promise.all([
    User.find(vendorQuery)
      .select('firstName lastName email avatar vendorProfile')
      .skip(skip)
      .limit(limit)
      .sort({ 'vendorProfile.rating': -1, createdAt: -1 }),
    User.countDocuments(vendorQuery),
  ]);

  // Step 3: For each vendor, get their services
  const vendorsWithServices = await Promise.all(
    vendors.map(async (vendor) => {
      const services = await Service.find({
        vendor: vendor._id,
        isActive: true,
        approvalStatus: 'approved',
      })
        .populate('category', 'name icon')
        .select('name description basePrice images category')
        .limit(5); // Limit to 5 services per vendor

      return {
        _id: vendor._id,
        businessName: vendor.vendorProfile?.businessName || `${vendor.firstName} ${vendor.lastName}`,
        rating: vendor.vendorProfile?.rating || 0,
        avatar: vendor.avatar, // ✅ Fixed: avatar is on User model, not vendorProfile
        isVerified: vendor.vendorProfile?.isVerified || false,
        vendorType: vendor.vendorProfile?.vendorType,
        services: services,
      };
    })
  );

  logger.info(`Vendor search query: "${query}" - Found ${total} vendors`);

  return {
    vendors: vendorsWithServices,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}




  /**
   * ADMIN: Get all pending services for approval
   */
  public async getPendingServices(
    page: number = 1,
    limit: number = 20
  ): Promise<{ services: IService[]; total: number; page: number; totalPages: number }> {
    // Pass all 5 parameters
    return this.getAllServices({ approvalStatus: 'pending' }, page, limit, 'createdAt', 'asc');
  }

  /**
   * ADMIN: Get service approval statistics
   */
  public async getApprovalStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const [pending, approved, rejected, total] = await Promise.all([
      Service.countDocuments({ approvalStatus: 'pending', isDeleted: false }),
      Service.countDocuments({ approvalStatus: 'approved', isDeleted: false }),
      Service.countDocuments({ approvalStatus: 'rejected', isDeleted: false }),
      Service.countDocuments({ isDeleted: false }),
    ]);

    return {
      pending,
      approved,
      rejected,
      total,
    };
  }

  /**
   * Add review to service
   */
  public async addReview(
    serviceId: string,
    clientId: string,
    bookingId: string,
    data: {
      rating: number;
      comment?: string;
      images?: string[];
    }
  ): Promise<IReview> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Check if user already reviewed this service
    const existingReview = await Review.findOne({ service: serviceId, client: clientId });
    if (existingReview) {
      throw new BadRequestError('You have already reviewed this service');
    }

    // Create review
    const review = await Review.create({
      service: serviceId,
      vendor: service.vendor,
      client: clientId,
      booking: bookingId,
      ...data,
      isVerified: true,
    });

    logger.info(`Review added for service ${serviceId} by client ${clientId}`);

    return review;
  }

  /**
   * Get service reviews
   */
  public async getServiceReviews(
    serviceId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: IReview[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const [reviews, total] = await Promise.all([
      Review.find({ service: serviceId })
        .populate('client', 'firstName lastName avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Review.countDocuments({ service: serviceId }),
    ]);

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Respond to review (vendor)
   */
  public async respondToReview(
    reviewId: string,
    vendorId: string,
    responseText: string
  ): Promise<IReview> {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Check ownership - reviewee should be the vendor
    if (review.reviewee.toString() !== vendorId) {
      throw new ForbiddenError('You can only respond to reviews about you');
    }

    review.response = {
      comment: responseText,
      respondedAt: new Date(),
    };

    await review.save();

    logger.info(`Vendor responded to review ${reviewId}`);

    return review;
  }

  /**
   * Get trending services
   */
  public async getTrendingServices(limit: number = 10): Promise<IService[]> {
    const services = await Service.find({ 
      isActive: true,
      approvalStatus: 'approved'
    })
      .populate('vendor', 'firstName lastName vendorProfile.businessName vendorProfile.rating')
      .populate('category', 'name slug icon')
      .sort({ 'metadata.bookings': -1, 'metadata.averageRating': -1 })
      .limit(limit);

    return services;
  }

  /**
   * Get popular services by category
   */
  public async getPopularByCategory(categoryId: string, limit: number = 5): Promise<IService[]> {
    const services = await Service.find({ 
      category: categoryId, 
      isActive: true,
      approvalStatus: 'approved'
    })
      .populate('vendor', 'firstName lastName vendorProfile.businessName')
      .sort({ 'metadata.averageRating': -1, 'metadata.bookings': -1 })
      .limit(limit);

    return services;
  }
}

export default new ServiceService();