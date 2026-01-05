import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import serviceService from '../services/service.service';
import ResponseHandler from '../utils/response'; // ✅ Fixed - default import
import { asyncHandler } from '../middlewares/error'; // Check if this should also be default
import { BadRequestError, NotFoundError } from '../utils/errors';
import { uploadMultipleToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import logger from '../utils/logger';;

class ServiceController {
  /**
   * Create new service
   */
  public createService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;

      // Parse JSON fields from FormData
      if (req.body.serviceArea && typeof req.body.serviceArea === 'string') {
        try {
          req.body.serviceArea = JSON.parse(req.body.serviceArea);
        } catch (error) {
          throw new BadRequestError('Invalid service area format');
        }
      }

      if (req.body.tags && typeof req.body.tags === 'string') {
        try {
          req.body.tags = JSON.parse(req.body.tags);
        } catch (error) {
          req.body.tags = [];
        }
      }

      // Convert string numbers to actual numbers
      if (req.body.basePrice) {
        req.body.basePrice = parseFloat(req.body.basePrice);
      }
      if (req.body.duration) {
        req.body.duration = parseInt(req.body.duration);
      }
      if (req.body.serviceArea?.radius) {
        req.body.serviceArea.radius = parseFloat(req.body.serviceArea.radius);
      }

      // Handle image uploads
      let imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          const buffers = req.files.map((file: Express.Multer.File) => file.buffer);
          imageUrls = await uploadMultipleToCloudinary(buffers, {
            folder: 'sharplook/services',
          });
          logger.info(`Uploaded ${imageUrls.length} images for service`);
        } catch (error) {
          logger.error('Image upload error:', error);
          throw new BadRequestError('Failed to upload images');
        }
      }

      const serviceData = {
        ...req.body,
        images: imageUrls,
      };

      const service = await serviceService.createService(vendorId, serviceData);

      return ResponseHandler.success(
        res,
        'Service created successfully. Pending admin approval.',
        service,
        201
      );
    }
  );

  /**
   * Update service
   */
  public updateService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const vendorId = req.user!.id;

      // Parse JSON fields from FormData
      if (req.body.serviceArea && typeof req.body.serviceArea === 'string') {
        try {
          req.body.serviceArea = JSON.parse(req.body.serviceArea);
        } catch (error) {
          throw new BadRequestError('Invalid service area format');
        }
      }

      if (req.body.existingImages && typeof req.body.existingImages === 'string') {
        try {
          req.body.existingImages = JSON.parse(req.body.existingImages);
        } catch (error) {
          req.body.existingImages = [];
        }
      }

      if (req.body.tags && typeof req.body.tags === 'string') {
        try {
          req.body.tags = JSON.parse(req.body.tags);
        } catch (error) {
          req.body.tags = [];
        }
      }

      // Convert string numbers to actual numbers
      if (req.body.basePrice) {
        req.body.basePrice = parseFloat(req.body.basePrice);
      }
      if (req.body.duration) {
        req.body.duration = parseInt(req.body.duration);
      }
      if (req.body.serviceArea?.radius) {
        req.body.serviceArea.radius = parseFloat(req.body.serviceArea.radius);
      }

      // Handle new image uploads
      let newImageUrls: string[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          const buffers = req.files.map((file: Express.Multer.File) => file.buffer);
          newImageUrls = await uploadMultipleToCloudinary(buffers, {
            folder: 'sharplook/services',
          });
          logger.info(`Uploaded ${newImageUrls.length} new images for service`);
        } catch (error) {
          logger.error('Image upload error:', error);
          throw new BadRequestError('Failed to upload images');
        }
      }

      // Merge existing and new images
      const existingImages = req.body.existingImages || [];
      req.body.images = [...existingImages, ...newImageUrls];

      const service = await serviceService.updateService(
        serviceId,
        vendorId,
        req.body
      );

      return ResponseHandler.success(
        res,
        'Service updated successfully',
        service
      );
    }
  );

  /**
   * Get my services (vendor)
   */
  public getMyServices = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await serviceService.getVendorServices(vendorId, page, limit);

      return ResponseHandler.success(res, 'Services retrieved successfully', result);
    }
  );

  /**
   * Get all services with filters
   */
 /**
 * Get all services with filters
 */
/**
 * Get all services with filters
 */
public getAllServices = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const filters = {
      vendor: req.query.vendor as string,
      category: req.query.category as string,
      subCategory: req.query.subCategory as string,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      rating: req.query.rating ? parseFloat(req.query.rating as string) : undefined,
      location: req.query.latitude && req.query.longitude
        ? {
            latitude: parseFloat(req.query.latitude as string),
            longitude: parseFloat(req.query.longitude as string),
            maxDistance: req.query.maxDistance
              ? parseFloat(req.query.maxDistance as string)
              : undefined,
          }
        : undefined,
      search: req.query.search as string,
      approvalStatus: req.query.approvalStatus as 'pending' | 'approved' | 'rejected' | undefined,
    };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    // Pass all 5 parameters including sortBy and sortOrder
    const result = await serviceService.getAllServices(filters, page, limit, sortBy, sortOrder);

    return ResponseHandler.success(res, 'Services retrieved successfully', result);
  }
);

  /**
   * Get service by ID
   */
  public getServiceById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const service = await serviceService.getServiceById(serviceId);

      if (!service) {
        throw new NotFoundError('Service not found');
      }

      return ResponseHandler.success(res, 'Service retrieved successfully', service);
    }
  );

  /**
   * Get service by slug
   */
  public getServiceBySlug = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { slug } = req.params;
      const service = await serviceService.getServiceBySlug(slug);

      if (!service) {
        throw new NotFoundError('Service not found');
      }

      return ResponseHandler.success(res, 'Service retrieved successfully', service);
    }
  );

  /**
   * Delete service
   */
  public deleteService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const vendorId = req.user!.id;

      // Get service to delete images
      const service = await serviceService.getServiceById(serviceId);
      
      if (service && service.images && service.images.length > 0) {
        try {
          // Delete images from Cloudinary
          await Promise.all(
            service.images.map((imageUrl) => deleteFromCloudinary(imageUrl))
          );
          logger.info(`Deleted ${service.images.length} images from Cloudinary`);
        } catch (error) {
          logger.error('Error deleting images from Cloudinary:', error);
        }
      }

      await serviceService.deleteService(serviceId, vendorId);

      return ResponseHandler.success(res, 'Service deleted successfully');
    }
  );

  /**
   * Toggle service status
   */
  public toggleServiceStatus = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const vendorId = req.user!.id;

      const service = await serviceService.toggleServiceStatus(serviceId, vendorId);

      return ResponseHandler.success(
        res,
        `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
        service
      );
    }
  );

  /**
   * Get service reviews
   */
  public getServiceReviews = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await serviceService.getServiceReviews(serviceId, page, limit);

      return ResponseHandler.success(res, 'Reviews retrieved successfully', result);
    }
  );

  /**
   * Add review to service
   */
  public addReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const clientId = req.user!.id;

      const review = await serviceService.addReview(
        serviceId,
        clientId,
        req.body.bookingId,
        req.body
      );

      return ResponseHandler.success(res, 'Review added successfully', review, 201);
    }
  );

  /**
   * Respond to review
   */
  public respondToReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reviewId } = req.params;
      const vendorId = req.user!.id;
      const { response } = req.body;

      const review = await serviceService.respondToReview(reviewId, vendorId, response);

      return ResponseHandler.success(res, 'Response added successfully', review);
    }
  );

  /**
   * Get trending services
   */
  public getTrendingServices = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const limit = parseInt(_req.query.limit as string) || 10;
      const services = await serviceService.getTrendingServices(limit);

      return ResponseHandler.success(res, 'Trending services retrieved', services);
    }
  );

  /**
   * Get popular services by category
   */
  public getPopularByCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { categoryId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const services = await serviceService.getPopularByCategory(categoryId, limit);

      return ResponseHandler.success(res, 'Popular services retrieved', services);
    }
  );

  // ==================== ADMIN ROUTES ====================

  /**
   * Get pending services (Admin)
   */
  public getPendingServices = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await serviceService.getPendingServices(page, limit);

      return ResponseHandler.success(res, 'Pending services retrieved', result);
    }
  );

  /**
   * Approve service (Admin)
   */
  public approveService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const adminId = req.user!.id;
      const { notes } = req.body;

      const service = await serviceService.approveService(serviceId, adminId, notes);

      return ResponseHandler.success(res, 'Service approved successfully', service);
    }
  );

  /**
   * Reject service (Admin)
   */
  public rejectService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { serviceId } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;

      const service = await serviceService.rejectService(serviceId, adminId, reason);

      return ResponseHandler.success(res, 'Service rejected', service);
    }
  );

  /**
 * Search services
 */
/**
 * Search vendors and their services
 */
public searchServices = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const query = req.query.query as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.trim().length === 0) {
      throw new BadRequestError('Search query is required');
    }

    const result = await serviceService.searchVendors(query, page, limit);

    return ResponseHandler.success(res, 'Vendors found successfully', result);
  }
);


  /**
   * Get approval statistics (Admin)
   */
  public getApprovalStats = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const stats = await serviceService.getApprovalStats();

      return ResponseHandler.success(res, 'Approval statistics retrieved', stats);
    }
  );
}

export default new ServiceController();