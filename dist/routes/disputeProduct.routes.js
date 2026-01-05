"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const disputeProduct_controller_1 = __importDefault(require("../controllers/disputeProduct.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const disputeProduct_validation_1 = require("../validations/disputeProduct.validation");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
// Configure for dispute evidence (up to 5 images)
const uploadDisputeEvidence = (0, upload_1.uploadMultipleImages)(5);
// ==================== USER ROUTES (CUSTOMER/SELLER) ====================
/**
 * @route   POST /api/v1/disputes
 * @desc    Create a new dispute
 * @access  Private (Customer or Seller)
 */
router.post('/', auth_1.authenticate, uploadDisputeEvidence, // For evidence
(0, validate_1.validate)(disputeProduct_validation_1.createDisputeValidation), disputeProduct_controller_1.default.createDispute);
/**
 * @route   GET /api/v1/disputes/my-disputes
 * @desc    Get user's disputes (customer or seller)
 * @access  Private
 */
router.get('/my-disputes', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(disputeProduct_validation_1.getDisputesValidation), disputeProduct_controller_1.default.getUserDisputes);
/**
 * @route   GET /api/v1/disputes/:disputeId
 * @desc    Get dispute by ID
 * @access  Private
 */
router.get('/:disputeId', auth_1.authenticate, (0, validate_1.validate)(disputeProduct_validation_1.disputeIdValidation), disputeProduct_controller_1.default.getDisputeById);
/**
 * @route   POST /api/v1/disputes/:disputeId/messages
 * @desc    Add message to dispute
 * @access  Private
 */
router.post('/:disputeId/messages', auth_1.authenticate, uploadDisputeEvidence, // For attachments
(0, validate_1.validate)(disputeProduct_validation_1.addMessageValidation), disputeProduct_controller_1.default.addMessage);
/**
 * @route   POST /api/v1/disputes/:disputeId/escalate
 * @desc    Escalate dispute
 * @access  Private (Customer or Seller)
 */
router.post('/:disputeId/escalate', auth_1.authenticate, (0, validate_1.validate)(disputeProduct_validation_1.escalateDisputeValidation), disputeProduct_controller_1.default.escalateDispute);
// ==================== ADMIN ROUTES ====================
/**
 * @route   GET /api/v1/disputes/admin/stats
 * @desc    Get dispute statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', auth_1.authenticate, auth_1.requireAdmin, disputeProduct_controller_1.default.getDisputeStats);
/**
 * @route   GET /api/v1/disputes/admin/open
 * @desc    Get open disputes
 * @access  Private (Admin)
 */
router.get('/admin/open', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, disputeProduct_controller_1.default.getOpenDisputes);
/**
 * @route   GET /api/v1/disputes/admin/high-priority
 * @desc    Get high priority disputes
 * @access  Private (Admin)
 */
router.get('/admin/high-priority', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, disputeProduct_controller_1.default.getHighPriorityDisputes);
/**
 * @route   GET /api/v1/disputes/admin/assigned-to-me
 * @desc    Get my assigned disputes
 * @access  Private (Admin)
 */
router.get('/admin/assigned-to-me', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, disputeProduct_controller_1.default.getMyAssignedDisputes);
/**
 * @route   GET /api/v1/disputes/admin/all
 * @desc    Get all disputes
 * @access  Private (Admin)
 */
router.get('/admin/all', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(disputeProduct_validation_1.getDisputesValidation), disputeProduct_controller_1.default.getAllDisputes);
/**
 * @route   POST /api/v1/disputes/:disputeId/assign
 * @desc    Assign dispute to admin
 * @access  Private (Admin)
 */
router.post('/:disputeId/assign', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(disputeProduct_validation_1.assignDisputeValidation), disputeProduct_controller_1.default.assignDispute);
/**
 * @route   POST /api/v1/disputes/:disputeId/resolve
 * @desc    Resolve dispute
 * @access  Private (Admin)
 */
router.post('/:disputeId/resolve', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(disputeProduct_validation_1.resolveDisputeValidation), disputeProduct_controller_1.default.resolveDispute);
/**
 * @route   POST /api/v1/disputes/:disputeId/close
 * @desc    Close dispute
 * @access  Private (Admin)
 */
router.post('/:disputeId/close', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(disputeProduct_validation_1.closeDisputeValidation), disputeProduct_controller_1.default.closeDispute);
exports.default = router;
//# sourceMappingURL=disputeProduct.routes.js.map