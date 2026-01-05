"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const offer_service_1 = __importDefault(require("../services/offer.service"));
const Category_1 = __importDefault(require("../models/Category"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const errors_1 = require("../utils/errors");
const cloudinary_1 = require("../utils/cloudinary");
const logger_1 = __importDefault(require("../utils/logger"));
class OfferController {
    constructor() {
        /**
         * Create new offer request
         * ✅ UPDATED: Added serviceType validation
         */
        this.createOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            // ✅ Validate required fields first
            if (!req.body.title || !req.body.description || !req.body.category) {
                throw new errors_1.BadRequestError('Title, description, and category are required');
            }
            // ✅ NEW: Validate serviceType
            if (!req.body.serviceType) {
                throw new errors_1.BadRequestError('Service type is required. Must be: home, shop, or both');
            }
            if (!['home', 'shop', 'both'].includes(req.body.serviceType)) {
                throw new errors_1.BadRequestError('Invalid service type. Must be: home, shop, or both');
            }
            // ✅ NEW: Validate location for home service
            if ((req.body.serviceType === 'home' || req.body.serviceType === 'both')) {
                if (!req.body.location) {
                    throw new errors_1.BadRequestError('Location is required for home service requests');
                }
            }
            // Validate category exists BEFORE processing anything else
            console.log('🔍 Validating category:', req.body.category);
            const category = await Category_1.default.findOne({
                _id: req.body.category,
                isActive: true,
                isDeleted: { $ne: true }
            });
            if (!category) {
                // Get all active categories for debugging
                const allCategories = await Category_1.default.find({ isActive: true, isDeleted: { $ne: true } }, '_id name slug');
                console.error('❌ Category not found:', {
                    searchedId: req.body.category,
                    availableCategories: allCategories.map(c => ({
                        id: c._id.toString(),
                        name: c.name
                    }))
                });
                throw new errors_1.BadRequestError(`Category not found. Available categories: ${allCategories.map(c => c.name).join(', ')}`);
            }
            console.log('✅ Category validated:', {
                id: category._id,
                name: category.name
            });
            // Parse JSON fields from FormData if needed
            if (req.body.location && typeof req.body.location === 'string') {
                try {
                    req.body.location = JSON.parse(req.body.location);
                }
                catch (error) {
                    throw new errors_1.BadRequestError('Invalid location format');
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
            let imageUrls = [];
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                try {
                    const buffers = req.files.map((file) => file.buffer);
                    imageUrls = await (0, cloudinary_1.uploadMultipleToCloudinary)(buffers, {
                        folder: 'sharplook/offers',
                    });
                    logger_1.default.info(`Uploaded ${imageUrls.length} images for offer`);
                }
                catch (error) {
                    logger_1.default.error('Image upload error:', error);
                    throw new errors_1.BadRequestError('Failed to upload images');
                }
            }
            const offerData = {
                ...req.body,
                images: imageUrls,
            };
            const offer = await offer_service_1.default.createOffer(clientId, offerData);
            return response_1.default.success(res, `Offer created successfully for ${req.body.serviceType} service`, offer, 201);
        });
        /**
         * Get available offers (vendors)
         */
        this.getAvailableOffers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                category: req.query.category,
                priceMin: req.query.priceMin ? parseFloat(req.query.priceMin) : undefined,
                priceMax: req.query.priceMax ? parseFloat(req.query.priceMax) : undefined,
                location: req.query.latitude && req.query.longitude
                    ? {
                        latitude: parseFloat(req.query.latitude),
                        longitude: parseFloat(req.query.longitude),
                        maxDistance: req.query.maxDistance
                            ? parseFloat(req.query.maxDistance)
                            : undefined,
                    }
                    : undefined,
            };
            const result = await offer_service_1.default.getAvailableOffers(vendorId, filters, page, limit);
            return response_1.default.success(res, 'Available offers retrieved', result);
        });
        /**
         * Respond to offer (vendor)
         */
        this.respondToOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const vendorId = req.user.id;
            const offer = await offer_service_1.default.respondToOffer(offerId, vendorId, req.body);
            return response_1.default.success(res, 'Response submitted successfully', offer);
        });
        /**
         * Submit counter offer (client)
         */
        this.counterOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const clientId = req.user.id;
            const { counterPrice } = req.body;
            const offer = await offer_service_1.default.counterOffer(offerId, clientId, responseId, counterPrice);
            return response_1.default.success(res, 'Counter offer submitted', offer);
        });
        /**
         * Accept vendor response (client)
         */
        this.acceptResponse = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const clientId = req.user.id;
            const result = await offer_service_1.default.acceptResponse(offerId, clientId, responseId);
            return response_1.default.success(res, 'Response accepted and booking created', result);
        });
        /**
         * Get offer by ID
         */
        this.getOfferById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const userId = req.user.id;
            const offer = await offer_service_1.default.getOfferById(offerId, userId);
            return response_1.default.success(res, 'Offer retrieved', offer);
        });
        /**
         * Get my offers (client)
         */
        this.getMyOffers = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const clientId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await offer_service_1.default.getClientOffers(clientId, page, limit);
            return response_1.default.success(res, 'Your offers retrieved', result);
        });
        /**
         * Get my responses (vendor)
         */
        this.getMyResponses = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await offer_service_1.default.getVendorResponses(vendorId, page, limit);
            return response_1.default.success(res, 'Your responses retrieved', result);
        });
        /**
         * Close offer (client)
         */
        this.closeOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            const clientId = req.user.id;
            const offer = await offer_service_1.default.closeOffer(offerId, clientId);
            return response_1.default.success(res, 'Offer closed successfully', offer);
        });
        /**
         * Vendor accepts client's counter offer
         */
        this.acceptCounterOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const vendorId = req.user.id;
            const result = await offer_service_1.default.acceptCounterOffer(offerId, responseId, vendorId);
            return response_1.default.success(res, 'Counter offer accepted successfully', result);
        });
        /**
         * Vendor makes a counter offer to client's counter
         */
        this.vendorCounterOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId, responseId } = req.params;
            const { proposedPrice } = req.body;
            const vendorId = req.user.id;
            if (!proposedPrice || proposedPrice <= 0) {
                throw new errors_1.BadRequestError('Valid proposed price is required');
            }
            const result = await offer_service_1.default.vendorCounterOffer(offerId, responseId, vendorId, proposedPrice);
            return response_1.default.success(res, 'Counter offer submitted successfully', result);
        });
        /**
       * Get all offers (admin)
       */
        this.getAllOffersAdmin = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                category: req.query.category,
                client: req.query.client,
            };
            if (req.query.startDate) {
                filters.startDate = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filters.endDate = new Date(req.query.endDate);
            }
            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const result = await offer_service_1.default.getAllOffers(filters, page, limit);
            return response_1.default.paginated(res, 'Offers retrieved successfully', result.offers, page, limit, result.total);
        });
        /**
         * Get offer statistics (admin)
         */
        this.getOfferStatsAdmin = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await offer_service_1.default.getOfferStats();
            return response_1.default.success(res, 'Offer statistics retrieved', { stats });
        });
        /**
         * Delete offer (admin)
         */
        this.deleteOffer = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { offerId } = req.params;
            await offer_service_1.default.deleteOffer(offerId);
            return response_1.default.success(res, 'Offer deleted successfully');
        });
    }
}
exports.default = new OfferController();
//# sourceMappingURL=offer.controller.js.map