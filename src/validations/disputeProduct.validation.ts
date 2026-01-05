import { body, param, query } from 'express-validator';
import { DisputeStatus, DisputeReason, DisputeResolution } from '../models/DisputeProduct';

/**
 * Create dispute validation
 */
export const createDisputeValidation = [
  body('order')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('product')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('reason')
    .notEmpty()
    .withMessage('Dispute reason is required')
    .isIn(Object.values(DisputeReason))
    .withMessage('Invalid dispute reason'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
];

/**
 * Dispute ID validation
 */
export const disputeIdValidation = [
  param('disputeId').isMongoId().withMessage('Invalid dispute ID'),
];

/**
 * Get disputes validation
 */
export const getDisputesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(Object.values(DisputeStatus))
    .withMessage('Invalid dispute status'),

  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),

  query('reason')
    .optional()
    .isIn(Object.values(DisputeReason))
    .withMessage('Invalid dispute reason'),

  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid admin ID'),

  query('role')
    .optional()
    .isIn(['customer', 'seller'])
    .withMessage('Role must be either customer or seller'),
];

/**
 * Add message validation
 */
export const addMessageValidation = [
  param('disputeId').isMongoId().withMessage('Invalid dispute ID'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
];

/**
 * Assign dispute validation
 */
export const assignDisputeValidation = [
  param('disputeId').isMongoId().withMessage('Invalid dispute ID'),

  body('adminId')
    .optional()
    .isMongoId()
    .withMessage('Invalid admin ID'),
];

/**
 * Resolve dispute validation
 */
export const resolveDisputeValidation = [
  param('disputeId').isMongoId().withMessage('Invalid dispute ID'),

  body('resolution')
    .notEmpty()
    .withMessage('Resolution is required')
    .isIn(Object.values(DisputeResolution))
    .withMessage('Invalid resolution type'),

  body('resolutionNote')
    .trim()
    .notEmpty()
    .withMessage('Resolution note is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Resolution note must be between 10 and 1000 characters'),

  body('refundAmount')
    .if(body('resolution').equals(DisputeResolution.PARTIAL_REFUND))
    .notEmpty()
    .withMessage('Refund amount is required for partial refund')
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),
];

/**
 * Close dispute validation
 */
export const closeDisputeValidation = [
  param('disputeId').isMongoId().withMessage('Invalid dispute ID'),

  body('closureNote')
    .trim()
    .notEmpty()
    .withMessage('Closure note is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Closure note must be between 10 and 500 characters'),
];

/**
 * Escalate dispute validation
 */
export const escalateDisputeValidation = [
  param('disputeId').isMongoId().withMessage('Invalid dispute ID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Escalation reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Escalation reason must be between 10 and 500 characters'),
];