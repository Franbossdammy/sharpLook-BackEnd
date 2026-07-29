import { body, param, query } from 'express-validator';

/**
 * Create dispute validation
 */
export const createDisputeValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),

  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isIn(['service_not_completed', 'poor_quality', 'wrong_service', 'no_show', 'overcharged', 'other', 'client_no_show', 'client_refused_payment', 'abusive_behavior', 'late_cancellation', 'fraudulent_booking'])
    .withMessage('Invalid reason selected'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be at least 20 characters'),

  body('evidenceType')
    .optional()
    .isIn(['receipt', 'chat_conversation', 'video_recording', 'other_document'])
    .withMessage('Invalid evidence type'),
];

/**
 * Add evidence validation
 */
export const addEvidenceValidation = [
  body('evidence')
    .isArray({ min: 1 })
    .withMessage('At least one evidence item is required'),

  body('evidence.*.type')
    .isIn(['text', 'image', 'document'])
    .withMessage('Invalid evidence type'),

  body('evidence.*.content')
    .trim()
    .notEmpty()
    .withMessage('Evidence content is required'),
];

/**
 * Add message validation
 */
export const addMessageValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),

  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),

  body('attachments.*')
    .optional()
    .isURL()
    .withMessage('Each attachment must be a valid URL'),
];

/**
 * Dispute ID param validation
 */
export const disputeIdValidation = [
  param('disputeId').isMongoId().withMessage('Invalid dispute ID'),
];

/**
 * Assign dispute validation
 */
export const assignDisputeValidation = [
  body('assignToId')
    .notEmpty()
    .withMessage('Assign to ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

/**
 * Update priority validation
 */
export const updatePriorityValidation = [
  body('priority')
    .notEmpty()
    .withMessage('Priority is required')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
];

/**
 * Resolve dispute validation
 */
export const resolveDisputeValidation = [
  body('resolution')
    .notEmpty()
    .withMessage('Resolution is required')
    .isIn(['refund_client', 'pay_vendor', 'partial_refund'])
    .withMessage('Invalid resolution type'),

  body('resolutionDetails')
    .trim()
    .notEmpty()
    .withMessage('Resolution details are required')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Resolution details must be between 20 and 1000 characters'),

  body('refundAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),

  body('vendorPaymentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Vendor payment amount must be a positive number'),
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
    .isIn(['open', 'in_review', 'resolved', 'closed'])
    .withMessage('Invalid status'),

  query('category')
    .optional()
    .isIn(['service_quality', 'payment', 'no_show', 'other'])
    .withMessage('Invalid category'),

  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignedTo ID'),
];
