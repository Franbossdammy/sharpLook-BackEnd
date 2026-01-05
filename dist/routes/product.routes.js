"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = __importDefault(require("../controllers/product.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const product_validation_1 = require("../validations/product.validation");
const upload_1 = require("../middlewares/upload");
const uploadProductImages = (0, upload_1.uploadMultipleImages)(10);
const router = (0, express_1.Router)();
// ==================== IMPORTANT: SPECIFIC ROUTES MUST COME BEFORE DYNAMIC ROUTES ====================
// ==================== ADMIN ROUTES (PLACE BEFORE DYNAMIC ROUTES) ====================
/**
 * @route   GET /api/v1/products/admin/stats
 * @desc    Get product statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', auth_1.authenticate, auth_1.requireAdmin, product_controller_1.default.getAdminStats);
/**
 * @route   GET /api/v1/products/admin/pending
 * @desc    Get pending products for approval
 * @access  Private (Admin)
 */
router.get('/admin/pending', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, product_controller_1.default.getPendingProducts);
// ==================== FEATURED & SPONSORED ROUTES ====================
/**
 * @route   GET /api/v1/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', auth_1.optionalAuth, validate_1.validatePagination, product_controller_1.default.getFeaturedProducts);
/**
 * @route   GET /api/v1/products/sponsored
 * @desc    Get sponsored products
 * @access  Public
 */
router.get('/sponsored', auth_1.optionalAuth, validate_1.validatePagination, product_controller_1.default.getSponsoredProducts);
// ==================== SELLER ROUTES ====================
/**
 * @route   GET /api/v1/products/seller/my-products
 * @desc    Get seller's products
 * @access  Private (Vendor/Admin)
 */
router.get('/seller/my-products', auth_1.authenticate, validate_1.validatePagination, product_controller_1.default.getMyProducts);
// ==================== PUBLIC ROUTES ====================
/**
 * @route   GET /api/v1/products
 * @desc    Get all approved products (with filters)
 * @access  Public
 */
router.get('/', auth_1.optionalAuth, validate_1.validatePagination, (0, validate_1.validate)(product_validation_1.getProductsValidation), product_controller_1.default.getProducts);
/**
 * @route   POST /api/v1/products
 * @desc    Create a new product
 * @access  Private (Vendor/Admin)
 */
router.post('/', auth_1.authenticate, uploadProductImages, (0, validate_1.validate)(product_validation_1.createProductValidation), product_controller_1.default.createProduct);
// ==================== DYNAMIC ROUTES (MUST BE LAST) ====================
/**
 * @route   GET /api/v1/products/:productId
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:productId', auth_1.optionalAuth, (0, validate_1.validate)(product_validation_1.productIdValidation), product_controller_1.default.getProductById);
/**
 * @route   GET /api/v1/products/admin/rejected
 * @desc    Get rejected products
 * @access  Private (Admin)
 */
router.get('/admin/rejected', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, product_controller_1.default.getRejectedProducts);
/**
 * @route   PUT /api/v1/products/:productId
 * @desc    Update product
 * @access  Private (Seller only)
 */
router.put('/:productId', auth_1.authenticate, uploadProductImages, (0, validate_1.validate)(product_validation_1.updateProductValidation), product_controller_1.default.updateProduct);
/**
 * @route   DELETE /api/v1/products/:productId
 * @desc    Delete product (soft delete)
 * @access  Private (Seller only)
 */
router.delete('/:productId', auth_1.authenticate, (0, validate_1.validate)(product_validation_1.productIdValidation), product_controller_1.default.deleteProduct);
/**
 * @route   PATCH /api/v1/products/:productId/stock
 * @desc    Update product stock
 * @access  Private (Seller only)
 */
router.patch('/:productId/stock', auth_1.authenticate, (0, validate_1.validate)(product_validation_1.updateStockValidation), product_controller_1.default.updateStock);
/**
 * @route   POST /api/v1/products/:productId/approve
 * @desc    Approve product
 * @access  Private (Admin)
 */
router.post('/:productId/approve', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(product_validation_1.approveProductValidation), product_controller_1.default.approveProduct);
/**
 * @route   POST /api/v1/products/:productId/reject
 * @desc    Reject product
 * @access  Private (Admin)
 */
router.post('/:productId/reject', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(product_validation_1.rejectProductValidation), product_controller_1.default.rejectProduct);
/**
 * @route   POST /api/v1/products/:productId/feature
 * @desc    Feature product
 * @access  Private (Admin)
 */
router.post('/:productId/feature', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(product_validation_1.featureProductValidation), product_controller_1.default.featureProduct);
/**
 * @route   POST /api/v1/products/:productId/sponsor
 * @desc    Sponsor product
 * @access  Private (Admin)
 */
router.post('/:productId/sponsor', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(product_validation_1.sponsorProductValidation), product_controller_1.default.sponsorProduct);
/**
 * @route   GET /api/v1/products/admin/all
 * @desc    Get all products (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/all', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, product_controller_1.default.getAllProductsForAdmin);
exports.default = router;
//# sourceMappingURL=product.routes.js.map