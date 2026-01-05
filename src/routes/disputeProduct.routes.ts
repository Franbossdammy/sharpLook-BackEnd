import { Router } from 'express';
import disputeController from '../controllers/disputeProduct.controller';
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createDisputeValidation,
  disputeIdValidation,
  getDisputesValidation,
  addMessageValidation,
  assignDisputeValidation,
  resolveDisputeValidation,
  closeDisputeValidation,
  escalateDisputeValidation,
} from '../validations/disputeProduct.validation';
import { uploadMultipleImages } from '../middlewares/upload';

const router = Router();

// Configure for dispute evidence (up to 5 images)
const uploadDisputeEvidence = uploadMultipleImages(5);

// ==================== USER ROUTES (CUSTOMER/SELLER) ====================

/**
 * @route   POST /api/v1/disputes
 * @desc    Create a new dispute
 * @access  Private (Customer or Seller)
 */
router.post(
  '/',
  authenticate,
  uploadDisputeEvidence, // For evidence
  validate(createDisputeValidation),
  disputeController.createDispute
);

/**
 * @route   GET /api/v1/disputes/my-disputes
 * @desc    Get user's disputes (customer or seller)
 * @access  Private
 */
router.get(
  '/my-disputes',
  authenticate,
  validatePagination,
  validate(getDisputesValidation),
  disputeController.getUserDisputes
);

/**
 * @route   GET /api/v1/disputes/:disputeId
 * @desc    Get dispute by ID
 * @access  Private
 */
router.get(
  '/:disputeId',
  authenticate,
  validate(disputeIdValidation),
  disputeController.getDisputeById
);

/**
 * @route   POST /api/v1/disputes/:disputeId/messages
 * @desc    Add message to dispute
 * @access  Private
 */
router.post(
  '/:disputeId/messages',
  authenticate,
  uploadDisputeEvidence, // For attachments
  validate(addMessageValidation),
  disputeController.addMessage
);

/**
 * @route   POST /api/v1/disputes/:disputeId/escalate
 * @desc    Escalate dispute
 * @access  Private (Customer or Seller)
 */
router.post(
  '/:disputeId/escalate',
  authenticate,
  validate(escalateDisputeValidation),
  disputeController.escalateDispute
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/disputes/admin/stats
 * @desc    Get dispute statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/stats',
  authenticate,
  requireAdmin,
  disputeController.getDisputeStats
);

/**
 * @route   GET /api/v1/disputes/admin/open
 * @desc    Get open disputes
 * @access  Private (Admin)
 */
router.get(
  '/admin/open',
  authenticate,
  requireAdmin,
  validatePagination,
  disputeController.getOpenDisputes
);

/**
 * @route   GET /api/v1/disputes/admin/high-priority
 * @desc    Get high priority disputes
 * @access  Private (Admin)
 */
router.get(
  '/admin/high-priority',
  authenticate,
  requireAdmin,
  validatePagination,
  disputeController.getHighPriorityDisputes
);

/**
 * @route   GET /api/v1/disputes/admin/assigned-to-me
 * @desc    Get my assigned disputes
 * @access  Private (Admin)
 */
router.get(
  '/admin/assigned-to-me',
  authenticate,
  requireAdmin,
  validatePagination,
  disputeController.getMyAssignedDisputes
);

/**
 * @route   GET /api/v1/disputes/admin/all
 * @desc    Get all disputes
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getDisputesValidation),
  disputeController.getAllDisputes
);

/**
 * @route   POST /api/v1/disputes/:disputeId/assign
 * @desc    Assign dispute to admin
 * @access  Private (Admin)
 */
router.post(
  '/:disputeId/assign',
  authenticate,
  requireAdmin,
  validate(assignDisputeValidation),
  disputeController.assignDispute
);

/**
 * @route   POST /api/v1/disputes/:disputeId/resolve
 * @desc    Resolve dispute
 * @access  Private (Admin)
 */
router.post(
  '/:disputeId/resolve',
  authenticate,
  requireAdmin,
  validate(resolveDisputeValidation),
  disputeController.resolveDispute
);

/**
 * @route   POST /api/v1/disputes/:disputeId/close
 * @desc    Close dispute
 * @access  Private (Admin)
 */
router.post(
  '/:disputeId/close',
  authenticate,
  requireAdmin,
  validate(closeDisputeValidation),
  disputeController.closeDispute
);

export default router;