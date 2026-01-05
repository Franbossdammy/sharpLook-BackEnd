import { Router } from 'express';
import productController from '../controllers/product.controller';
import {
  authenticate,
  requireAdmin,
  optionalAuth,
} from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createProductValidation,
  updateProductValidation,
  productIdValidation,
  getProductsValidation,
  approveProductValidation,
  rejectProductValidation,
  featureProductValidation,
  sponsorProductValidation,
  updateStockValidation,
} from '../validations/product.validation';
import { uploadMultipleImages } from '../middlewares/upload';

const uploadProductImages = uploadMultipleImages(10);

const router = Router();

// ==================== IMPORTANT: SPECIFIC ROUTES MUST COME BEFORE DYNAMIC ROUTES ====================

// ==================== ADMIN ROUTES (PLACE BEFORE DYNAMIC ROUTES) ====================

/**
 * @route   GET /api/v1/products/admin/stats
 * @desc    Get product statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/stats',
  authenticate,
  requireAdmin,
  productController.getAdminStats
);

/**
 * @route   GET /api/v1/products/admin/pending
 * @desc    Get pending products for approval
 * @access  Private (Admin)
 */
router.get(
  '/admin/pending',
  authenticate,
  requireAdmin,
  validatePagination,
  productController.getPendingProducts
);

// ==================== FEATURED & SPONSORED ROUTES ====================

/**
 * @route   GET /api/v1/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get(
  '/featured',
  optionalAuth,
  validatePagination, 
  productController.getFeaturedProducts
);

/**
 * @route   GET /api/v1/products/sponsored
 * @desc    Get sponsored products
 * @access  Public
 */
router.get(
  '/sponsored',
  optionalAuth,
  validatePagination, 
  productController.getSponsoredProducts
);

// ==================== SELLER ROUTES ====================

/**
 * @route   GET /api/v1/products/seller/my-products
 * @desc    Get seller's products
 * @access  Private (Vendor/Admin)
 */
router.get(
  '/seller/my-products',
  authenticate,
  validatePagination,
  productController.getMyProducts
);

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/v1/products
 * @desc    Get all approved products (with filters)
 * @access  Public
 */
router.get(
  '/',
  optionalAuth,
  validatePagination,
  validate(getProductsValidation),
  productController.getProducts
);

/**
 * @route   POST /api/v1/products
 * @desc    Create a new product
 * @access  Private (Vendor/Admin)
 */
router.post(
  '/',
  authenticate,
  uploadProductImages,
  validate(createProductValidation),
  productController.createProduct
);

// ==================== DYNAMIC ROUTES (MUST BE LAST) ====================

/**
 * @route   GET /api/v1/products/:productId
 * @desc    Get product by ID
 * @access  Public
 */
router.get(
  '/:productId',
  optionalAuth,
  validate(productIdValidation),
  productController.getProductById
);


/**
 * @route   GET /api/v1/products/admin/rejected
 * @desc    Get rejected products
 * @access  Private (Admin)
 */
router.get(
  '/admin/rejected',
  authenticate,
  requireAdmin,
  validatePagination,
  productController.getRejectedProducts
);
/**
 * @route   PUT /api/v1/products/:productId
 * @desc    Update product
 * @access  Private (Seller only)
 */
router.put(
  '/:productId',
  authenticate,
  uploadProductImages,
  validate(updateProductValidation),
  productController.updateProduct
);

/**
 * @route   DELETE /api/v1/products/:productId
 * @desc    Delete product (soft delete)
 * @access  Private (Seller only)
 */
router.delete(
  '/:productId',
  authenticate,
  validate(productIdValidation),
  productController.deleteProduct
);

/**
 * @route   PATCH /api/v1/products/:productId/stock
 * @desc    Update product stock
 * @access  Private (Seller only)
 */
router.patch(
  '/:productId/stock',
  authenticate,
  validate(updateStockValidation),
  productController.updateStock
);

/**
 * @route   POST /api/v1/products/:productId/approve
 * @desc    Approve product
 * @access  Private (Admin)
 */
router.post(
  '/:productId/approve',
  authenticate,
  requireAdmin,
  validate(approveProductValidation),
  productController.approveProduct
);

/**
 * @route   POST /api/v1/products/:productId/reject
 * @desc    Reject product
 * @access  Private (Admin)
 */
router.post(
  '/:productId/reject',
  authenticate,
  requireAdmin,
  validate(rejectProductValidation),
  productController.rejectProduct
);

/**
 * @route   POST /api/v1/products/:productId/feature
 * @desc    Feature product
 * @access  Private (Admin)
 */
router.post(
  '/:productId/feature',
  authenticate,
  requireAdmin,
  validate(featureProductValidation),
  productController.featureProduct
);

/**
 * @route   POST /api/v1/products/:productId/sponsor
 * @desc    Sponsor product
 * @access  Private (Admin)
 */
router.post(
  '/:productId/sponsor',
  authenticate,
  requireAdmin,
  validate(sponsorProductValidation),
  productController.sponsorProduct
);

/**
 * @route   GET /api/v1/products/admin/all
 * @desc    Get all products (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  validatePagination,
  productController.getAllProductsForAdmin
);

export default router;