import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import offerService from '../services/offer.service';
import Category from '../models/Category'; // ✅ ADD THIS IMPORT
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { BadRequestError } from '../utils/errors';
import { uploadMultipleToCloudinary } from '../utils/cloudinary';
import logger from '../utils/logger';

class OfferController {
  /**
   * Create new offer request
   */
  public createOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;

      // ✅ ADD: Validate required fields first
      if (!req.body.title || !req.body.description || !req.body.category) {
        throw new BadRequestError('Title, description, and category are required');
      }

      // ✅ ADD: Validate category exists BEFORE processing anything else
      console.log('🔍 Validating category:', req.body.category);
      
      const category = await Category.findOne({
        _id: req.body.category,
        isActive: true,
        isDeleted: { $ne: true }
      });

      if (!category) {
        // Get all active categories for debugging
        const allCategories = await Category.find(
          { isActive: true, isDeleted: { $ne: true } },
          '_id name slug'
        );
        
        console.error('❌ Category not found:', {
          searchedId: req.body.category,
          availableCategories: allCategories.map(c => ({
            id: c._id.toString(),
            name: c.name
          }))
        });

        throw new BadRequestError(
          `Category not found. Available categories: ${allCategories.map(c => c.name).join(', ')}`
        );
      }

      console.log('✅ Category validated:', {
        id: category._id,
        name: category.name
      });

      // Parse JSON fields from FormData if needed
      if (req.body.location && typeof req.body.location === 'string') {
        try {
          req.body.location = JSON.parse(req.body.location);
        } catch (error) {
          throw new BadRequestError('Invalid location format');
        }
      }

      // Convert string numbers to actual numbers
      if (req.body.proposedPrice) {
        req.body.proposedPrice = parseFloat(req.body.proposedPrice);
      }
      if (req.body.expiresInDays) {
        req.body.expiresInDays = parseInt(req.body.expiresInDays);
      }

      // Handle image uploads
      let imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          const buffers = req.files.map((file: Express.Multer.File) => file.buffer);
          imageUrls = await uploadMultipleToCloudinary(buffers, {
            folder: 'sharplook/offers',
          });
          logger.info(`Uploaded ${imageUrls.length} images for offer`);
        } catch (error) {
          logger.error('Image upload error:', error);
          throw new BadRequestError('Failed to upload images');
        }
      }

      const offerData = {
        ...req.body,
        images: imageUrls,
      };

      const offer = await offerService.createOffer(clientId, offerData);

      return ResponseHandler.success(
        res,
        'Offer created successfully',
        offer,
        201
      );
    }
  );
  /**
   * Get available offers (vendors)
   */
  public getAvailableOffers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters = {
        category: req.query.category as string,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
        location: req.query.latitude && req.query.longitude
          ? {
              latitude: parseFloat(req.query.latitude as string),
              longitude: parseFloat(req.query.longitude as string),
              maxDistance: req.query.maxDistance
                ? parseFloat(req.query.maxDistance as string)
                : undefined,
            }
          : undefined,
      };

      const result = await offerService.getAvailableOffers(
        vendorId,
        filters,
        page,
        limit
      );

      return ResponseHandler.success(res, 'Available offers retrieved', result);
    }
  );

  /**
   * Respond to offer (vendor)
   */
  public respondToOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const vendorId = req.user!.id;

      const offer = await offerService.respondToOffer(offerId, vendorId, req.body);

      return ResponseHandler.success(res, 'Response submitted successfully', offer);
    }
  );

  /**
   * Submit counter offer (client)
   */
  public counterOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const clientId = req.user!.id;
      const { counterPrice } = req.body;

      const offer = await offerService.counterOffer(
        offerId,
        clientId,
        responseId,
        counterPrice
      );

      return ResponseHandler.success(res, 'Counter offer submitted', offer);
    }
  );

  /**
   * Accept vendor response (client)
   */
  public acceptResponse = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const clientId = req.user!.id;

      const result = await offerService.acceptResponse(offerId, clientId, responseId);

      return ResponseHandler.success(
        res,
        'Response accepted and booking created',
        result
      );
    }
  );

  /**
   * Get offer by ID
   */
  public getOfferById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const userId = req.user!.id;

      const offer = await offerService.getOfferById(offerId, userId);

      return ResponseHandler.success(res, 'Offer retrieved', offer);
    }
  );

  /**
   * Get my offers (client)
   */
  public getMyOffers = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const clientId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await offerService.getClientOffers(clientId, page, limit);

      return ResponseHandler.success(res, 'Your offers retrieved', result);
    }
  );

  /**
   * Get my responses (vendor)
   */
  public getMyResponses = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await offerService.getVendorResponses(vendorId, page, limit);

      return ResponseHandler.success(res, 'Your responses retrieved', result);
    }
  );

  /**
   * Close offer (client)
   */
  public closeOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId } = req.params;
      const clientId = req.user!.id;

      const offer = await offerService.closeOffer(offerId, clientId);

      return ResponseHandler.success(res, 'Offer closed successfully', offer);
    }
  );

  /**
   * Vendor accepts client's counter offer
   */
  public acceptCounterOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const vendorId = req.user!.id;

      const result = await offerService.acceptCounterOffer(
        offerId,
        responseId,
        vendorId
      );

      return ResponseHandler.success(
        res,
        'Counter offer accepted successfully',
        result
      );
    }
  );

  /**
   * Vendor makes a counter offer to client's counter
   */
  public vendorCounterOffer = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { offerId, responseId } = req.params;
      const { proposedPrice } = req.body;
      const vendorId = req.user!.id;

      if (!proposedPrice || proposedPrice <= 0) {
        throw new BadRequestError('Valid proposed price is required');
      }

      const result = await offerService.vendorCounterOffer(
        offerId,
        responseId,
        vendorId,
        proposedPrice
      );

      return ResponseHandler.success(
        res,
        'Counter offer submitted successfully',
        result
      );
    }
  );


  /**
 * Get all offers (admin)
 */
public getAllOffersAdmin = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters: any = {
      status: req.query.status as string,
      category: req.query.category as string,
      client: req.query.client as string,
    };

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await offerService.getAllOffers(filters, page, limit);

    return ResponseHandler.paginated(
      res,
      'Offers retrieved successfully',
      result.offers,
      page,
      limit,
      result.total
    );
  }
);

/**
 * Get offer statistics (admin)
 */
public getOfferStatsAdmin = asyncHandler(
  async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    const stats = await offerService.getOfferStats();

    return ResponseHandler.success(res, 'Offer statistics retrieved', { stats });
  }
);

/**
 * Delete offer (admin)
 */
public deleteOffer = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { offerId } = req.params;

    await offerService.deleteOffer(offerId);

    return ResponseHandler.success(res, 'Offer deleted successfully');
  }
);
}

export default new OfferController();