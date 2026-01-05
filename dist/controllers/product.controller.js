"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const product_service_1 = __importDefault(require("../services/product.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const cloudinary_1 = require("../utils/cloudinary");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
class ProductController {
    constructor() {
        /**
         * Create a new product
         * POST /api/v1/products
         */
        this.createProduct = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
            // Handle multiple image uploads
            const files = req.files;
            const imageUrls = [];
            if (!files || files.length === 0) {
                throw new errors_1.BadRequestError('At least one product image is required');
            }
            try {
                // Upload images to Cloudinary
                for (const file of files) {
                    const imageUrl = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
                        folder: 'sharplook/products',
                        transformation: [
                            { width: 800, height: 800, crop: 'limit' },
                            { quality: 'auto' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    imageUrls.push(imageUrl);
                }
                const productData = {
                    ...req.body,
                    images: imageUrls,
                };
                // Parse arrays from form-data
                if (req.body.tags && typeof req.body.tags === 'string') {
                    productData.tags = JSON.parse(req.body.tags);
                }
                if (req.body.variants && typeof req.body.variants === 'string') {
                    productData.variants = JSON.parse(req.body.variants);
                }
                if (req.body.deliveryOptions && typeof req.body.deliveryOptions === 'string') {
                    productData.deliveryOptions = JSON.parse(req.body.deliveryOptions);
                }
                if (req.body.location && typeof req.body.location === 'string') {
                    productData.location = JSON.parse(req.body.location);
                }
                if (req.body.dimensions && typeof req.body.dimensions === 'string') {
                    productData.dimensions = JSON.parse(req.body.dimensions);
                }
                if (req.body.discount && typeof req.body.discount === 'string') {
                    productData.discount = JSON.parse(req.body.discount);
                }
                const sellerType = isAdmin ? 'admin' : 'vendor';
                const product = await product_service_1.default.createProduct(userId, sellerType, productData);
                return response_1.default.success(res, isAdmin ? 'Product created and approved' : 'Product created successfully. Awaiting admin approval', { product }, 201);
            }
            catch (error) {
                // Clean up uploaded images if product creation fails
                for (const imageUrl of imageUrls) {
                    try {
                        await (0, cloudinary_1.deleteFromCloudinary)(imageUrl);
                    }
                    catch (err) {
                        logger_1.default.warn(`Failed to delete image: ${imageUrl}`);
                    }
                }
                throw error;
            }
        });
        /**
         * Get all products (clients - only approved)
         * GET /api/v1/products
         */
        this.getProducts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sortBy = req.query.sortBy || 'createdAt';
            const sortOrder = req.query.sortOrder || 'desc';
            const filters = {
                category: req.query.category,
                subCategory: req.query.subCategory,
                seller: req.query.seller,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
                condition: req.query.condition,
                brand: req.query.brand,
                search: req.query.search,
                isFeatured: req.query.isFeatured === 'true' ? true : undefined,
                isSponsored: req.query.isSponsored === 'true' ? true : undefined,
            };
            if (req.query.tags) {
                filters.tags = req.query.tags.split(',');
            }
            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const result = await product_service_1.default.getProducts(filters, page, limit, sortBy, sortOrder);
            return response_1.default.paginated(res, 'Products retrieved successfully', result.products, page, limit, result.total);
        });
        /**
         * Get featured products
         * GET /api/v1/products/featured
         */
        this.getFeaturedProducts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await product_service_1.default.getFeaturedProducts(page, limit);
            return response_1.default.paginated(res, 'Featured products retrieved successfully', result.products, page, limit, result.total);
        });
        /**
         * Get sponsored products
         * GET /api/v1/products/sponsored
         */
        this.getSponsoredProducts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await product_service_1.default.getSponsoredProducts(page, limit);
            return response_1.default.paginated(res, 'Sponsored products retrieved successfully', result.products, page, limit, result.total);
        });
        /**
         * Get admin statistics
         * GET /api/v1/products/admin/stats
         */
        this.getAdminStats = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const stats = await product_service_1.default.getAdminStats();
            return response_1.default.success(res, 'Product statistics retrieved successfully', stats);
        });
        // Add to ProductController class
        /**
         * Get all products for admin
         * GET /api/v1/products/admin/all
         */
        this.getAllProductsForAdmin = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const sortBy = req.query.sortBy || 'createdAt';
            const sortOrder = req.query.sortOrder || 'desc';
            const result = await product_service_1.default.getAllProductsForAdmin(page, limit, sortBy, sortOrder);
            return response_1.default.paginated(res, 'All products retrieved successfully', result.products, page, limit, result.total);
        });
        /**
         * Get rejected products (admin only)
         * GET /api/v1/products/admin/rejected
         */
        this.getRejectedProducts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await product_service_1.default.getRejectedProducts(page, limit);
            return response_1.default.paginated(res, 'Rejected products retrieved successfully', result.products, page, limit, result.total);
        });
        /**
         * Get product by ID
         * GET /api/v1/products/:productId
         */
        this.getProductById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const incrementView = req.query.incrementView !== 'false';
            const product = await product_service_1.default.getProductById(productId, incrementView);
            return response_1.default.success(res, 'Product retrieved successfully', {
                product,
            });
        });
        /**
         * Get seller's products
         * GET /api/v1/products/seller/my-products
         */
        this.getMyProducts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await product_service_1.default.getSellerProducts(userId, page, limit);
            return response_1.default.paginated(res, 'Your products retrieved successfully', result.products, page, limit, result.total);
        });
        /**
         * Get pending products (admin only)
         * GET /api/v1/products/admin/pending
         */
        this.getPendingProducts = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await product_service_1.default.getPendingProducts(page, limit);
            return response_1.default.paginated(res, 'Pending products retrieved successfully', result.products, page, limit, result.total);
        });
        /**
         * Update product
         * PUT /api/v1/products/:productId
         */
        this.updateProduct = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const userId = req.user.id;
            // Handle image uploads if any
            const files = req.files;
            const updates = { ...req.body };
            if (files && files.length > 0) {
                const imageUrls = [];
                for (const file of files) {
                    const imageUrl = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
                        folder: 'sharplook/products',
                        transformation: [
                            { width: 800, height: 800, crop: 'limit' },
                            { quality: 'auto' },
                            { fetch_format: 'auto' }
                        ]
                    });
                    imageUrls.push(imageUrl);
                }
                // Append to existing images or replace
                if (req.body.replaceImages === 'true') {
                    updates.images = imageUrls;
                }
                else {
                    const currentProduct = await product_service_1.default.getProductById(productId, false);
                    updates.images = [...currentProduct.images, ...imageUrls];
                }
            }
            // Parse JSON strings from form-data
            if (req.body.tags && typeof req.body.tags === 'string') {
                updates.tags = JSON.parse(req.body.tags);
            }
            if (req.body.variants && typeof req.body.variants === 'string') {
                updates.variants = JSON.parse(req.body.variants);
            }
            if (req.body.deliveryOptions && typeof req.body.deliveryOptions === 'string') {
                updates.deliveryOptions = JSON.parse(req.body.deliveryOptions);
            }
            if (req.body.location && typeof req.body.location === 'string') {
                updates.location = JSON.parse(req.body.location);
            }
            if (req.body.dimensions && typeof req.body.dimensions === 'string') {
                updates.dimensions = JSON.parse(req.body.dimensions);
            }
            if (req.body.discount && typeof req.body.discount === 'string') {
                updates.discount = JSON.parse(req.body.discount);
            }
            const product = await product_service_1.default.updateProduct(productId, userId, updates);
            return response_1.default.success(res, 'Product updated successfully', {
                product,
            });
        });
        /**
         * Delete product
         * DELETE /api/v1/products/:productId
         */
        this.deleteProduct = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const userId = req.user.id;
            await product_service_1.default.deleteProduct(productId, userId);
            return response_1.default.success(res, 'Product deleted successfully');
        });
        /**
         * Approve product (admin only)
         * POST /api/v1/products/:productId/approve
         */
        this.approveProduct = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const adminId = req.user.id;
            const product = await product_service_1.default.approveProduct(productId, adminId);
            return response_1.default.success(res, 'Product approved successfully', {
                product,
            });
        });
        /**
         * Reject product (admin only)
         * POST /api/v1/products/:productId/reject
         */
        this.rejectProduct = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const product = await product_service_1.default.rejectProduct(productId, adminId, reason);
            return response_1.default.success(res, 'Product rejected', {
                product,
            });
        });
        /**
         * Feature product (admin only)
         * POST /api/v1/products/:productId/feature
         */
        this.featureProduct = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const adminId = req.user.id;
            const { featuredUntil } = req.body;
            const product = await product_service_1.default.featureProduct(productId, adminId, new Date(featuredUntil));
            return response_1.default.success(res, 'Product featured successfully', {
                product,
            });
        });
        /**
         * Sponsor product (admin only)
         * POST /api/v1/products/:productId/sponsor
         */
        this.sponsorProduct = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const adminId = req.user.id;
            const { sponsoredUntil, amount } = req.body;
            const product = await product_service_1.default.sponsorProduct(productId, adminId, new Date(sponsoredUntil), amount);
            return response_1.default.success(res, 'Product sponsored successfully', {
                product,
            });
        });
        /**
         * Update stock
         * PATCH /api/v1/products/:productId/stock
         */
        this.updateStock = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { productId } = req.params;
            const { quantity } = req.body;
            const product = await product_service_1.default.updateStock(productId, quantity);
            return response_1.default.success(res, 'Stock updated successfully', {
                product: {
                    id: product._id,
                    name: product.name,
                    stock: product.stock,
                    status: product.status,
                },
            });
        });
        /**
         * Get featured products
         * GET /api/v1/products/featured
         */
    }
}
exports.default = new ProductController();
//# sourceMappingURL=product.controller.js.map