"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Product_1 = __importStar(require("../models/Product"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const mongoose_1 = __importDefault(require("mongoose"));
class ProductService {
    /**
     * Create a new product (vendor or admin)
     */
    async createProduct(sellerId, sellerType, productData) {
        // Admin products are auto-approved
        const approvalStatus = sellerType === 'admin' ? 'approved' : 'pending';
        const status = sellerType === 'admin' ? Product_1.ProductStatus.APPROVED : Product_1.ProductStatus.PENDING;
        const product = await Product_1.default.create({
            ...productData,
            seller: sellerId,
            sellerType,
            approvalStatus,
            status,
            ...(sellerType === 'admin' && {
                approvedBy: sellerId,
                approvedAt: new Date(),
            }),
        });
        logger_1.default.info(`Product created: ${product._id} by ${sellerType} ${sellerId}`);
        return product;
    }
    /**
     * Get product by ID
     */
    async getProductById(productId, incrementView = false) {
        const product = await Product_1.default.findById(productId)
            .populate('seller', 'firstName lastName email avatar vendorProfile')
            .populate('category', 'name icon slug')
            .populate('subCategory', 'name icon slug');
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        // Increment view count
        if (incrementView) {
            product.views += 1;
            await product.save();
        }
        return product;
    }
    /**
     * Get all products with filters (for clients - only approved)
     */
    async getProducts(filters, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc') {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query - only approved and active products
        const query = {
            approvalStatus: 'approved',
            status: { $nin: [Product_1.ProductStatus.DISCONTINUED] },
            isActive: true,
        };
        if (filters?.category) {
            query.category = filters.category;
        }
        if (filters?.subCategory) {
            query.subCategory = filters.subCategory;
        }
        if (filters?.seller) {
            query.seller = filters.seller;
        }
        if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
            query.price = {};
            if (filters.minPrice !== undefined) {
                query.price.$gte = filters.minPrice;
            }
            if (filters.maxPrice !== undefined) {
                query.price.$lte = filters.maxPrice;
            }
        }
        if (filters?.condition) {
            query.condition = filters.condition;
        }
        if (filters?.brand) {
            query.brand = new RegExp(filters.brand, 'i');
        }
        if (filters?.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }
        if (filters?.isFeatured !== undefined) {
            query.isFeatured = filters.isFeatured;
            query.featuredUntil = { $gte: new Date() };
        }
        if (filters?.isSponsored !== undefined) {
            query.isSponsored = filters.isSponsored;
            query.sponsoredUntil = { $gte: new Date() };
        }
        if (filters?.search) {
            query.$text = { $search: filters.search };
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .populate('seller', 'firstName lastName avatar vendorProfile')
                .populate('category', 'name icon slug')
                .populate('subCategory', 'name icon slug')
                .skip(skip)
                .limit(limit)
                .sort(sortOptions),
            Product_1.default.countDocuments(query),
        ]);
        return {
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    // Add this method to ProductService class
    /**
     * Get all products for admin (including pending, rejected, approved)
     */
    async getAllProductsForAdmin(page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc') {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Admin sees all products except deleted ones
        const query = {
            isDeleted: { $ne: true },
        };
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .populate('seller', 'firstName lastName avatar vendorProfile')
                .populate('category', 'name icon slug')
                .populate('subCategory', 'name icon slug')
                .skip(skip)
                .limit(limit)
                .sort(sortOptions),
            Product_1.default.countDocuments(query),
        ]);
        return {
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    // Add this method to your ProductService class in product.service.ts
    /**
     * Get admin statistics
     */
    async getAdminStats() {
        const [totalProducts, approvedProducts, pendingProducts, rejectedProducts, featuredProducts, sponsoredProducts, activeProducts, outOfStockProducts,] = await Promise.all([
            // Total products (excluding deleted)
            Product_1.default.countDocuments({ isDeleted: { $ne: true } }),
            // Approved products
            Product_1.default.countDocuments({
                approvalStatus: 'approved',
                isDeleted: { $ne: true }
            }),
            // Pending products
            Product_1.default.countDocuments({
                approvalStatus: 'pending',
                isDeleted: { $ne: true }
            }),
            // Rejected products
            Product_1.default.countDocuments({
                approvalStatus: 'rejected',
                isDeleted: { $ne: true }
            }),
            // Featured products (active featured)
            Product_1.default.countDocuments({
                isFeatured: true,
                featuredUntil: { $gte: new Date() },
                approvalStatus: 'approved',
                isDeleted: { $ne: true }
            }),
            // Sponsored products (active sponsored)
            Product_1.default.countDocuments({
                isSponsored: true,
                sponsoredUntil: { $gte: new Date() },
                approvalStatus: 'approved',
                isDeleted: { $ne: true }
            }),
            // Active products
            Product_1.default.countDocuments({
                isActive: true,
                approvalStatus: 'approved',
                status: { $nin: [Product_1.ProductStatus.DISCONTINUED] },
                isDeleted: { $ne: true }
            }),
            // Out of stock products
            Product_1.default.countDocuments({
                $or: [
                    { stock: 0 },
                    { stock: { $lte: 0 } },
                    { status: Product_1.ProductStatus.OUT_OF_STOCK }
                ],
                approvalStatus: 'approved',
                isDeleted: { $ne: true }
            }),
        ]);
        return {
            totalProducts,
            approvedProducts,
            pendingProducts,
            rejectedProducts,
            featuredProducts,
            sponsoredProducts,
            activeProducts,
            outOfStockProducts,
        };
    }
    /**
     * Get seller's products (vendor or admin)
     */
    async getSellerProducts(sellerId, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = { seller: sellerId };
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .populate('category', 'name icon slug')
                .populate('subCategory', 'name icon slug')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Product_1.default.countDocuments(query),
        ]);
        return {
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get pending products (admin only)
     */
    async getPendingProducts(page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = { approvalStatus: 'pending' };
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .populate('seller', 'firstName lastName email avatar vendorProfile')
                .populate('category', 'name icon slug')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: 1 }),
            Product_1.default.countDocuments(query),
        ]);
        return {
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update product (seller only)
     */
    /**
    * Update product (seller only)
    */
    async updateProduct(productId, sellerId, updates) {
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        // Check ownership
        if (product.seller.toString() !== sellerId) {
            throw new errors_1.ForbiddenError('You can only update your own products');
        }
        // Don't allow updating approval status
        delete updates.approvalStatus;
        delete updates.approvedBy;
        delete updates.approvedAt;
        delete updates.isFeatured;
        delete updates.isSponsored;
        Object.assign(product, updates);
        // Reset to pending status if product was previously approved
        if (product.approvalStatus === 'approved' || product.approvalStatus == "rejected") {
            product.approvalStatus = 'pending';
            product.status = Product_1.ProductStatus.PENDING;
            product.approvedBy = undefined;
            product.approvedAt = undefined;
        }
        await product.save();
        logger_1.default.info(`Product updated: ${productId} - Status reset to pending for re-approval`);
        return product;
    }
    /**
     * Approve product (admin only)
     */
    async approveProduct(productId, adminId) {
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        if (product.approvalStatus === 'approved') {
            throw new errors_1.BadRequestError('Product is already approved');
        }
        product.approvalStatus = 'approved';
        product.status = Product_1.ProductStatus.APPROVED;
        product.approvedBy = mongoose_1.default.Types.ObjectId.createFromHexString(adminId);
        product.approvedAt = new Date();
        product.rejectionReason = undefined;
        await product.save();
        logger_1.default.info(`Product approved: ${productId} by admin ${adminId}`);
        return product;
    }
    /**
     * Reject product (admin only)
     */
    async rejectProduct(productId, adminId, reason) {
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        product.approvalStatus = 'rejected';
        product.status = Product_1.ProductStatus.REJECTED;
        product.rejectionReason = reason;
        product.approvedBy = mongoose_1.default.Types.ObjectId.createFromHexString(adminId);
        await product.save();
        logger_1.default.info(`Product rejected: ${productId} by admin ${adminId}`);
        return product;
    }
    /**
     * Feature product (admin only)
     */
    async featureProduct(productId, adminId, featuredUntil) {
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        if (product.approvalStatus !== 'approved') {
            throw new errors_1.BadRequestError('Only approved products can be featured');
        }
        product.isFeatured = true;
        product.featuredUntil = featuredUntil;
        product.featuredBy = mongoose_1.default.Types.ObjectId.createFromHexString(adminId);
        await product.save();
        logger_1.default.info(`Product featured: ${productId} until ${featuredUntil}`);
        return product;
    }
    /**
     * Sponsor product (admin only)
     */
    async sponsorProduct(productId, adminId, sponsoredUntil, amount) {
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        if (product.approvalStatus !== 'approved') {
            throw new errors_1.BadRequestError('Only approved products can be sponsored');
        }
        product.isSponsored = true;
        product.sponsoredUntil = sponsoredUntil;
        product.sponsorshipAmount = amount;
        product.sponsoredBy = mongoose_1.default.Types.ObjectId.createFromHexString(adminId);
        await product.save();
        logger_1.default.info(`Product sponsored: ${productId} until ${sponsoredUntil}`);
        return product;
    }
    /**
     * Delete product (soft delete)
     */
    async deleteProduct(productId, userId) {
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        product.isDeleted = true;
        product.deletedAt = new Date();
        product.deletedBy = mongoose_1.default.Types.ObjectId.createFromHexString(userId);
        product.isActive = false;
        await product.save();
        logger_1.default.info(`Product deleted: ${productId}`);
    }
    /**
   * Get sponsored products (for admin or public display)
   */
    async getSponsoredProducts(page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {
            isSponsored: true,
            sponsoredUntil: { $gte: new Date() },
            approvalStatus: 'approved',
            isActive: true,
            isDeleted: { $ne: true }
        };
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .populate('seller', 'firstName lastName avatar vendorProfile')
                .populate('category', 'name icon slug')
                .populate('subCategory', 'name icon slug')
                .skip(skip)
                .limit(limit)
                .sort({ sponsoredUntil: -1 }), // Most recently sponsored first
            Product_1.default.countDocuments(query),
        ]);
        return {
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get featured products (for admin or public display)
     */
    async getFeaturedProducts(page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {
            isFeatured: true,
            featuredUntil: { $gte: new Date() },
            approvalStatus: 'approved',
            isActive: true,
            isDeleted: { $ne: true }
        };
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .populate('seller', 'firstName lastName avatar vendorProfile')
                .populate('category', 'name icon slug')
                .populate('subCategory', 'name icon slug')
                .skip(skip)
                .limit(limit)
                .sort({ featuredUntil: -1 }),
            Product_1.default.countDocuments(query),
        ]);
        return {
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Update stock
     */
    async updateStock(productId, quantity) {
        const product = await Product_1.default.findById(productId);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        product.stock = quantity;
        await product.save();
        return product;
    }
    /**
   * Get rejected products (admin only)
   */
    async getRejectedProducts(page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {
            approvalStatus: 'rejected',
            isDeleted: { $ne: true }
        };
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .populate('seller', 'firstName lastName email avatar vendorProfile')
                .populate('category', 'name icon slug')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Product_1.default.countDocuments(query),
        ]);
        return {
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
}
exports.default = new ProductService();
//# sourceMappingURL=product.service.js.map