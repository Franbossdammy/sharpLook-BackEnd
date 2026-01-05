"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const service_service_1 = __importDefault(require("../services/service.service"));
const response_1 = __importDefault(require("../utils/response")); // ✅ Fixed - default import
const error_1 = require("../middlewares/error"); // Check if this should also be default
const errors_1 = require("../utils/errors");
const cloudinary_1 = require("../utils/cloudinary");
const logger_1 = __importDefault(require("../utils/logger"));
;
class ServiceController {
    constructor() {
        /**
         * Create new service
         */
        this.createService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            // Parse JSON fields from FormData
            if (req.body.serviceArea && typeof req.body.serviceArea === 'string') {
                try {
                    req.body.serviceArea = JSON.parse(req.body.serviceArea);
                }
                catch (error) {
                    throw new errors_1.BadRequestError('Invalid service area format');
                }
            }
            if (req.body.tags && typeof req.body.tags === 'string') {
                try {
                    req.body.tags = JSON.parse(req.body.tags);
                }
                catch (error) {
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
            let imageUrls = [];
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                try {
                    const buffers = req.files.map((file) => file.buffer);
                    imageUrls = await (0, cloudinary_1.uploadMultipleToCloudinary)(buffers, {
                        folder: 'sharplook/services',
                    });
                    logger_1.default.info(`Uploaded ${imageUrls.length} images for service`);
                }
                catch (error) {
                    logger_1.default.error('Image upload error:', error);
                    throw new errors_1.BadRequestError('Failed to upload images');
                }
            }
            const serviceData = {
                ...req.body,
                images: imageUrls,
            };
            const service = await service_service_1.default.createService(vendorId, serviceData);
            return response_1.default.success(res, 'Service created successfully. Pending admin approval.', service, 201);
        });
        /**
         * Update service
         */
        this.updateService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const vendorId = req.user.id;
            // Parse JSON fields from FormData
            if (req.body.serviceArea && typeof req.body.serviceArea === 'string') {
                try {
                    req.body.serviceArea = JSON.parse(req.body.serviceArea);
                }
                catch (error) {
                    throw new errors_1.BadRequestError('Invalid service area format');
                }
            }
            if (req.body.existingImages && typeof req.body.existingImages === 'string') {
                try {
                    req.body.existingImages = JSON.parse(req.body.existingImages);
                }
                catch (error) {
                    req.body.existingImages = [];
                }
            }
            if (req.body.tags && typeof req.body.tags === 'string') {
                try {
                    req.body.tags = JSON.parse(req.body.tags);
                }
                catch (error) {
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
            let newImageUrls = [];
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                try {
                    const buffers = req.files.map((file) => file.buffer);
                    newImageUrls = await (0, cloudinary_1.uploadMultipleToCloudinary)(buffers, {
                        folder: 'sharplook/services',
                    });
                    logger_1.default.info(`Uploaded ${newImageUrls.length} new images for service`);
                }
                catch (error) {
                    logger_1.default.error('Image upload error:', error);
                    throw new errors_1.BadRequestError('Failed to upload images');
                }
            }
            // Merge existing and new images
            const existingImages = req.body.existingImages || [];
            req.body.images = [...existingImages, ...newImageUrls];
            const service = await service_service_1.default.updateService(serviceId, vendorId, req.body);
            return response_1.default.success(res, 'Service updated successfully', service);
        });
        /**
         * Get my services (vendor)
         */
        this.getMyServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const vendorId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await service_service_1.default.getVendorServices(vendorId, page, limit);
            return response_1.default.success(res, 'Services retrieved successfully', result);
        });
        /**
         * Get all services with filters
         */
        /**
        * Get all services with filters
        */
        /**
         * Get all services with filters
         */
        this.getAllServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const filters = {
                vendor: req.query.vendor,
                category: req.query.category,
                subCategory: req.query.subCategory,
                priceMin: req.query.priceMin ? parseFloat(req.query.priceMin) : undefined,
                priceMax: req.query.priceMax ? parseFloat(req.query.priceMax) : undefined,
                rating: req.query.rating ? parseFloat(req.query.rating) : undefined,
                location: req.query.latitude && req.query.longitude
                    ? {
                        latitude: parseFloat(req.query.latitude),
                        longitude: parseFloat(req.query.longitude),
                        maxDistance: req.query.maxDistance
                            ? parseFloat(req.query.maxDistance)
                            : undefined,
                    }
                    : undefined,
                search: req.query.search,
                approvalStatus: req.query.approvalStatus,
            };
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const sortBy = req.query.sortBy || 'createdAt';
            const sortOrder = req.query.sortOrder || 'desc';
            // Pass all 5 parameters including sortBy and sortOrder
            const result = await service_service_1.default.getAllServices(filters, page, limit, sortBy, sortOrder);
            return response_1.default.success(res, 'Services retrieved successfully', result);
        });
        /**
         * Get service by ID
         */
        this.getServiceById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const service = await service_service_1.default.getServiceById(serviceId);
            if (!service) {
                throw new errors_1.NotFoundError('Service not found');
            }
            return response_1.default.success(res, 'Service retrieved successfully', service);
        });
        /**
         * Get service by slug
         */
        this.getServiceBySlug = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { slug } = req.params;
            const service = await service_service_1.default.getServiceBySlug(slug);
            if (!service) {
                throw new errors_1.NotFoundError('Service not found');
            }
            return response_1.default.success(res, 'Service retrieved successfully', service);
        });
        /**
         * Delete service
         */
        this.deleteService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const vendorId = req.user.id;
            // Get service to delete images
            const service = await service_service_1.default.getServiceById(serviceId);
            if (service && service.images && service.images.length > 0) {
                try {
                    // Delete images from Cloudinary
                    await Promise.all(service.images.map((imageUrl) => (0, cloudinary_1.deleteFromCloudinary)(imageUrl)));
                    logger_1.default.info(`Deleted ${service.images.length} images from Cloudinary`);
                }
                catch (error) {
                    logger_1.default.error('Error deleting images from Cloudinary:', error);
                }
            }
            await service_service_1.default.deleteService(serviceId, vendorId);
            return response_1.default.success(res, 'Service deleted successfully');
        });
        /**
         * Toggle service status
         */
        this.toggleServiceStatus = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const vendorId = req.user.id;
            const service = await service_service_1.default.toggleServiceStatus(serviceId, vendorId);
            return response_1.default.success(res, `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`, service);
        });
        /**
         * Get service reviews
         */
        this.getServiceReviews = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await service_service_1.default.getServiceReviews(serviceId, page, limit);
            return response_1.default.success(res, 'Reviews retrieved successfully', result);
        });
        /**
         * Add review to service
         */
        this.addReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const clientId = req.user.id;
            const review = await service_service_1.default.addReview(serviceId, clientId, req.body.bookingId, req.body);
            return response_1.default.success(res, 'Review added successfully', review, 201);
        });
        /**
         * Respond to review
         */
        this.respondToReview = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reviewId } = req.params;
            const vendorId = req.user.id;
            const { response } = req.body;
            const review = await service_service_1.default.respondToReview(reviewId, vendorId, response);
            return response_1.default.success(res, 'Response added successfully', review);
        });
        /**
         * Get trending services
         */
        this.getTrendingServices = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const limit = parseInt(_req.query.limit) || 10;
            const services = await service_service_1.default.getTrendingServices(limit);
            return response_1.default.success(res, 'Trending services retrieved', services);
        });
        /**
         * Get popular services by category
         */
        this.getPopularByCategory = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { categoryId } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            const services = await service_service_1.default.getPopularByCategory(categoryId, limit);
            return response_1.default.success(res, 'Popular services retrieved', services);
        });
        // ==================== ADMIN ROUTES ====================
        /**
         * Get pending services (Admin)
         */
        this.getPendingServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await service_service_1.default.getPendingServices(page, limit);
            return response_1.default.success(res, 'Pending services retrieved', result);
        });
        /**
         * Approve service (Admin)
         */
        this.approveService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const adminId = req.user.id;
            const { notes } = req.body;
            const service = await service_service_1.default.approveService(serviceId, adminId, notes);
            return response_1.default.success(res, 'Service approved successfully', service);
        });
        /**
         * Reject service (Admin)
         */
        this.rejectService = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { serviceId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const service = await service_service_1.default.rejectService(serviceId, adminId, reason);
            return response_1.default.success(res, 'Service rejected', service);
        });
        /**
       * Search services
       */
        /**
         * Search vendors and their services
         */
        this.searchServices = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const query = req.query.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            if (!query || query.trim().length === 0) {
                throw new errors_1.BadRequestError('Search query is required');
            }
            const result = await service_service_1.default.searchVendors(query, page, limit);
            return response_1.default.success(res, 'Vendors found successfully', result);
        });
        /**
         * Get approval statistics (Admin)
         */
        this.getApprovalStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await service_service_1.default.getApprovalStats();
            return response_1.default.success(res, 'Approval statistics retrieved', stats);
        });
    }
}
exports.default = new ServiceController();
//# sourceMappingURL=service.controller.js.map