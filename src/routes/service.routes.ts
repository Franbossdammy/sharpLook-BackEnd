import { Router } from 'express';
import serviceController from '../controllers/service.controller';
import { authenticate, requireVendor, requireAdmin, optionalAuth } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import { uploadMultipleImages } from '../middlewares/upload';
import {
  createServiceValidation,
  updateServiceValidation,
  serviceIdValidation,
  serviceSlugValidation,
  getServicesValidation,
  addReviewValidation,
  respondToReviewValidation,
  reviewIdValidation,
  approveServiceValidation,
  rejectServiceValidation,
} from '../validations/service.validation';

const router = Router();

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/services/admin/stats
 * @desc    Get service approval statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/stats',
  authenticate,
  requireAdmin,
  serviceController.getApprovalStats
);

/**
 * @route   GET /api/v1/services/admin/pending
 * @desc    Get all pending services
 * @access  Private (Admin)
 */
router.get(
  '/admin/pending',
  authenticate,
  requireAdmin,
  validatePagination,
  serviceController.getPendingServices
);

/**
 * @route   POST /api/v1/services/:serviceId/approve
 * @desc    Approve a service
 * @access  Private (Admin)
 */
router.post(
  '/:serviceId/approve',
  authenticate,
  requireAdmin,
  validate([...serviceIdValidation, ...approveServiceValidation]),
  serviceController.approveService
);

/**
 * @route   POST /api/v1/services/:serviceId/reject
 * @desc    Reject a service
 * @access  Private (Admin)
 */
router.post(
  '/:serviceId/reject',
  authenticate,
  requireAdmin,
  validate([...serviceIdValidation, ...rejectServiceValidation]),
  serviceController.rejectService
);

// ==================== PUBLIC ROUTES ====================


/**
 * @route   GET /api/v1/services/search
 * @desc    Search services by name, description, or category
 * @access  Public
 */
router.get(
  '/search',
  optionalAuth,
  validatePagination,
  serviceController.searchServices
);


/**
 * @route   GET /api/v1/services/trending
 * @desc    Get trending services
 * @access  Public
 */
router.get('/trending', optionalAuth, serviceController.getTrendingServices);

/**
 * @route   GET /api/v1/services/popular/:categoryId
 * @desc    Get popular services by category
 * @access  Public
 */
router.get('/popular/:categoryId', optionalAuth, serviceController.getPopularByCategory);

/**
 * @route   GET /api/v1/services/vendor/my-services
 * @desc    Get vendor's own services
 * @access  Private (Vendor)
 */
router.get(
  '/vendor/my-services',
  authenticate,
  requireVendor,
  validatePagination,
  serviceController.getMyServices
);

/**
 * @route   GET /api/v1/services/slug/:slug
 * @desc    Get service by slug
 * @access  Public
 */
router.get(
  '/slug/:slug',
  optionalAuth,
  validate(serviceSlugValidation),
  serviceController.getServiceBySlug
);

/**
 * @route   GET /api/v1/services/:serviceId/reviews
 * @desc    Get service reviews
 * @access  Public
 */
router.get(
  '/:serviceId/reviews',
  optionalAuth,
  validatePagination,
  validate(serviceIdValidation),
  serviceController.getServiceReviews
);

/**
 * @route   GET /api/v1/services/:serviceId
 * @desc    Get service by ID
 * @access  Public
 */
router.get(
  '/:serviceId',
  optionalAuth,
  validate(serviceIdValidation),
  serviceController.getServiceById
);

/**
 * @route   GET /api/v1/services
 * @desc    Get all services with filters
 * @access  Public
 */
router.get(
  '/',
  optionalAuth,
  validatePagination,
  validate(getServicesValidation),
  serviceController.getAllServices
);

/**
 * @route   POST /api/v1/services
 * @desc    Create service
 * @access  Private (Vendor)
 */
router.post(
  '/',
  authenticate,
  requireVendor,
  uploadMultipleImages(5), // Upload up to 5 images
  validate(createServiceValidation),
  serviceController.createService
);

/**
 * @route   POST /api/v1/services/:serviceId/reviews
 * @desc    Add review to service
 * @access  Private (Client - after booking completion)
 */
router.post(
  '/:serviceId/reviews',
  authenticate,
  validate([...serviceIdValidation, ...addReviewValidation]),
  serviceController.addReview
);

/**
 * @route   POST /api/v1/services/reviews/:reviewId/respond
 * @desc    Respond to review
 * @access  Private (Vendor)
 */
router.post(
  '/reviews/:reviewId/respond',
  authenticate,
  requireVendor,
  validate([...reviewIdValidation, ...respondToReviewValidation]),
  serviceController.respondToReview
);

/**
 * @route   PUT /api/v1/services/:serviceId
 * @desc    Update service
 * @access  Private (Vendor)
 */
router.put(
  '/:serviceId',
  authenticate,
  requireVendor,
  uploadMultipleImages(5), // Upload up to 5 images
  validate([...serviceIdValidation, ...updateServiceValidation]),
  serviceController.updateService
);

/**
 * @route   PATCH /api/v1/services/:serviceId/toggle
 * @desc    Toggle service active status
 * @access  Private (Vendor)
 */
router.patch(
  '/:serviceId/toggle',
  authenticate,
  requireVendor,
  validate(serviceIdValidation),
  serviceController.toggleServiceStatus
);

/**
 * @route   DELETE /api/v1/services/:serviceId
 * @desc    Delete service
 * @access  Private (Vendor)
 */
router.delete(
  '/:serviceId',
  authenticate,
  requireVendor,
  validate(serviceIdValidation),
  serviceController.deleteService
);

export default router;