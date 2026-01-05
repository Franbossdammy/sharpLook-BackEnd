"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dispute_controller_1 = __importDefault(require("../controllers/dispute.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const dispute_validation_1 = require("../validations/dispute.validation");
const router = (0, express_1.Router)();
// ==================== ADMIN ROUTES (SPECIFIC PATHS FIRST) ====================
/**
 * @route   GET /api/v1/disputes/stats
 * @desc    Get dispute statistics (Admin)
 * @access  Private (Admin)
 */
router.get('/stats', auth_1.authenticate, auth_1.requireAdmin, dispute_controller_1.default.getDisputeStats);
/**
 * @route   GET /api/v1/disputes
 * @desc    Get all disputes (Admin)
 * @access  Private (Admin)
 */
router.get('/', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(dispute_validation_1.getDisputesValidation), dispute_controller_1.default.getAllDisputes);
// ==================== USER ROUTES (SPECIFIC PATHS) ====================
/**
 * @route   POST /api/v1/disputes
 * @desc    Create dispute
 * @access  Private (Client or Vendor)
 */
router.post('/', auth_1.authenticate, (0, validate_1.validate)(dispute_validation_1.createDisputeValidation), dispute_controller_1.default.createDispute);
/**
 * @route   GET /api/v1/disputes/my-disputes
 * @desc    Get user disputes
 * @access  Private
 */
router.get('/my-disputes', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(dispute_validation_1.getDisputesValidation), dispute_controller_1.default.getUserDisputes);
// ==================== PARAMETERIZED ROUTES (MUST COME LAST) ====================
/**
 * @route   GET /api/v1/disputes/:disputeId
 * @desc    Get dispute by ID
 * @access  Private (Parties involved or Admin)
 */
router.get('/:disputeId', auth_1.authenticate, (0, validate_1.validate)(dispute_validation_1.disputeIdValidation), dispute_controller_1.default.getDisputeById);
/**
 * @route   POST /api/v1/disputes/:disputeId/evidence
 * @desc    Add evidence to dispute
 * @access  Private (Parties involved)
 */
router.post('/:disputeId/evidence', auth_1.authenticate, (0, validate_1.validate)([...dispute_validation_1.disputeIdValidation, ...dispute_validation_1.addEvidenceValidation]), dispute_controller_1.default.addEvidence);
/**
 * @route   POST /api/v1/disputes/:disputeId/messages
 * @desc    Add message to dispute
 * @access  Private (Parties involved or Admin)
 */
router.post('/:disputeId/messages', auth_1.authenticate, (0, validate_1.validate)([...dispute_validation_1.disputeIdValidation, ...dispute_validation_1.addMessageValidation]), dispute_controller_1.default.addMessage);
/**
 * @route   POST /api/v1/disputes/:disputeId/assign
 * @desc    Assign dispute to admin (Admin)
 * @access  Private (Admin)
 */
router.post('/:disputeId/assign', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...dispute_validation_1.disputeIdValidation, ...dispute_validation_1.assignDisputeValidation]), dispute_controller_1.default.assignDispute);
/**
 * @route   PUT /api/v1/disputes/:disputeId/priority
 * @desc    Update dispute priority (Admin)
 * @access  Private (Admin)
 */
router.put('/:disputeId/priority', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...dispute_validation_1.disputeIdValidation, ...dispute_validation_1.updatePriorityValidation]), dispute_controller_1.default.updatePriority);
/**
 * @route   POST /api/v1/disputes/:disputeId/resolve
 * @desc    Resolve dispute (Admin)
 * @access  Private (Admin)
 */
router.post('/:disputeId/resolve', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...dispute_validation_1.disputeIdValidation, ...dispute_validation_1.resolveDisputeValidation]), dispute_controller_1.default.resolveDispute);
/**
 * @route   POST /api/v1/disputes/:disputeId/close
 * @desc    Close dispute (Admin)
 * @access  Private (Admin)
 */
router.post('/:disputeId/close', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(dispute_validation_1.disputeIdValidation), dispute_controller_1.default.closeDispute);
exports.default = router;
//# sourceMappingURL=dispute.routes.js.map