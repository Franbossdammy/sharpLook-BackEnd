"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_controller_1 = __importDefault(require("../controllers/service.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const upload_1 = require("../middlewares/upload");
const service_validation_1 = require("../validations/service.validation");
const router = (0, express_1.Router)();
// ==================== ADMIN ROUTES ====================
/**
 * @route   GET /api/v1/services/admin/stats
 * @desc    Get service approval statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', auth_1.authenticate, auth_1.requireAdmin, service_controller_1.default.getApprovalStats);
/**
 * @route   GET /api/v1/services/admin/pending
 * @desc    Get all pending services
 * @access  Private (Admin)
 */
router.get('/admin/pending', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, service_controller_1.default.getPendingServices);
/**
 * @route   POST /api/v1/services/:serviceId/approve
 * @desc    Approve a service
 * @access  Private (Admin)
 */
router.post('/:serviceId/approve', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...service_validation_1.serviceIdValidation, ...service_validation_1.approveServiceValidation]), service_controller_1.default.approveService);
/**
 * @route   POST /api/v1/services/:serviceId/reject
 * @desc    Reject a service
 * @access  Private (Admin)
 */
router.post('/:serviceId/reject', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...service_validation_1.serviceIdValidation, ...service_validation_1.rejectServiceValidation]), service_controller_1.default.rejectService);
// ==================== PUBLIC ROUTES ====================
/**
 * @route   GET /api/v1/services/search
 * @desc    Search services by name, description, or category
 * @access  Public
 */
router.get('/search', auth_1.optionalAuth, validate_1.validatePagination, service_controller_1.default.searchServices);
/**
 * @route   GET /api/v1/services/trending
 * @desc    Get trending services
 * @access  Public
 */
router.get('/trending', auth_1.optionalAuth, service_controller_1.default.getTrendingServices);
/**
 * @route   GET /api/v1/services/popular/:categoryId
 * @desc    Get popular services by category
 * @access  Public
 */
router.get('/popular/:categoryId', auth_1.optionalAuth, service_controller_1.default.getPopularByCategory);
/**
 * @route   GET /api/v1/services/vendor/my-services
 * @desc    Get vendor's own services
 * @access  Private (Vendor)
 */
router.get('/vendor/my-services', auth_1.authenticate, auth_1.requireVendor, validate_1.validatePagination, service_controller_1.default.getMyServices);
/**
 * @route   GET /api/v1/services/slug/:slug
 * @desc    Get service by slug
 * @access  Public
 */
router.get('/slug/:slug', auth_1.optionalAuth, (0, validate_1.validate)(service_validation_1.serviceSlugValidation), service_controller_1.default.getServiceBySlug);
/**
 * @route   GET /api/v1/services/:serviceId/reviews
 * @desc    Get service reviews
 * @access  Public
 */
router.get('/:serviceId/reviews', auth_1.optionalAuth, validate_1.validatePagination, (0, validate_1.validate)(service_validation_1.serviceIdValidation), service_controller_1.default.getServiceReviews);
/**
 * @route   GET /api/v1/services/:serviceId
 * @desc    Get service by ID
 * @access  Public
 */
router.get('/:serviceId', auth_1.optionalAuth, (0, validate_1.validate)(service_validation_1.serviceIdValidation), service_controller_1.default.getServiceById);
/**
 * @route   GET /api/v1/services
 * @desc    Get all services with filters
 * @access  Public
 */
router.get('/', auth_1.optionalAuth, validate_1.validatePagination, (0, validate_1.validate)(service_validation_1.getServicesValidation), service_controller_1.default.getAllServices);
/**
 * @route   POST /api/v1/services
 * @desc    Create service
 * @access  Private (Vendor)
 */
router.post('/', auth_1.authenticate, auth_1.requireVendor, (0, upload_1.uploadMultipleImages)(5), // Upload up to 5 images
(0, validate_1.validate)(service_validation_1.createServiceValidation), service_controller_1.default.createService);
/**
 * @route   POST /api/v1/services/:serviceId/reviews
 * @desc    Add review to service
 * @access  Private (Client - after booking completion)
 */
router.post('/:serviceId/reviews', auth_1.authenticate, (0, validate_1.validate)([...service_validation_1.serviceIdValidation, ...service_validation_1.addReviewValidation]), service_controller_1.default.addReview);
/**
 * @route   POST /api/v1/services/reviews/:reviewId/respond
 * @desc    Respond to review
 * @access  Private (Vendor)
 */
router.post('/reviews/:reviewId/respond', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)([...service_validation_1.reviewIdValidation, ...service_validation_1.respondToReviewValidation]), service_controller_1.default.respondToReview);
/**
 * @route   PUT /api/v1/services/:serviceId
 * @desc    Update service
 * @access  Private (Vendor)
 */
router.put('/:serviceId', auth_1.authenticate, auth_1.requireVendor, (0, upload_1.uploadMultipleImages)(5), // Upload up to 5 images
(0, validate_1.validate)([...service_validation_1.serviceIdValidation, ...service_validation_1.updateServiceValidation]), service_controller_1.default.updateService);
/**
 * @route   PATCH /api/v1/services/:serviceId/toggle
 * @desc    Toggle service active status
 * @access  Private (Vendor)
 */
router.patch('/:serviceId/toggle', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)(service_validation_1.serviceIdValidation), service_controller_1.default.toggleServiceStatus);
/**
 * @route   DELETE /api/v1/services/:serviceId
 * @desc    Delete service
 * @access  Private (Vendor)
 */
router.delete('/:serviceId', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)(service_validation_1.serviceIdValidation), service_controller_1.default.deleteService);
exports.default = router;
//# sourceMappingURL=service.routes.js.map