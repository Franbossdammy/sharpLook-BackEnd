"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDisputesValidation = exports.resolveDisputeValidation = exports.updatePriorityValidation = exports.assignDisputeValidation = exports.disputeIdValidation = exports.addMessageValidation = exports.addEvidenceValidation = exports.createDisputeValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Create dispute validation
 */
exports.createDisputeValidation = [
    (0, express_validator_1.body)('bookingId')
        .notEmpty()
        .withMessage('Booking ID is required')
        .isMongoId()
        .withMessage('Invalid booking ID'),
    (0, express_validator_1.body)('reason')
        .trim()
        .notEmpty()
        .withMessage('Reason is required')
        .isLength({ min: 10, max: 200 })
        .withMessage('Reason must be between 10 and 200 characters'),
    (0, express_validator_1.body)('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 20, max: 2000 })
        .withMessage('Description must be between 20 and 2000 characters'),
    (0, express_validator_1.body)('category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(['service_quality', 'payment', 'cancellation', 'communication', 'other'])
        .withMessage('Invalid category'),
    (0, express_validator_1.body)('evidence')
        .optional()
        .isArray()
        .withMessage('Evidence must be an array'),
    (0, express_validator_1.body)('evidence.*.type')
        .optional()
        .isIn(['text', 'image', 'document'])
        .withMessage('Invalid evidence type'),
    (0, express_validator_1.body)('evidence.*.content')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Evidence content is required'),
];
/**
 * Add evidence validation
 */
exports.addEvidenceValidation = [
    (0, express_validator_1.body)('evidence')
        .isArray({ min: 1 })
        .withMessage('At least one evidence item is required'),
    (0, express_validator_1.body)('evidence.*.type')
        .isIn(['text', 'image', 'document'])
        .withMessage('Invalid evidence type'),
    (0, express_validator_1.body)('evidence.*.content')
        .trim()
        .notEmpty()
        .withMessage('Evidence content is required'),
];
/**
 * Add message validation
 */
exports.addMessageValidation = [
    (0, express_validator_1.body)('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    (0, express_validator_1.body)('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
    (0, express_validator_1.body)('attachments.*')
        .optional()
        .isURL()
        .withMessage('Each attachment must be a valid URL'),
];
/**
 * Dispute ID param validation
 */
exports.disputeIdValidation = [
    (0, express_validator_1.param)('disputeId').isMongoId().withMessage('Invalid dispute ID'),
];
/**
 * Assign dispute validation
 */
exports.assignDisputeValidation = [
    (0, express_validator_1.body)('assignToId')
        .notEmpty()
        .withMessage('Assign to ID is required')
        .isMongoId()
        .withMessage('Invalid user ID'),
];
/**
 * Update priority validation
 */
exports.updatePriorityValidation = [
    (0, express_validator_1.body)('priority')
        .notEmpty()
        .withMessage('Priority is required')
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority'),
];
/**
 * Resolve dispute validation
 */
exports.resolveDisputeValidation = [
    (0, express_validator_1.body)('resolution')
        .notEmpty()
        .withMessage('Resolution is required')
        .isIn(['refund_client', 'pay_vendor', 'partial_refund'])
        .withMessage('Invalid resolution type'),
    (0, express_validator_1.body)('resolutionDetails')
        .trim()
        .notEmpty()
        .withMessage('Resolution details are required')
        .isLength({ min: 20, max: 1000 })
        .withMessage('Resolution details must be between 20 and 1000 characters'),
    (0, express_validator_1.body)('refundAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Refund amount must be a positive number'),
    (0, express_validator_1.body)('vendorPaymentAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Vendor payment amount must be a positive number'),
];
/**
 * Get disputes validation
 */
exports.getDisputesValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['open', 'in_review', 'resolved', 'closed'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('category')
        .optional()
        .isIn(['service_quality', 'payment', 'cancellation', 'communication', 'other'])
        .withMessage('Invalid category'),
    (0, express_validator_1.query)('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority'),
    (0, express_validator_1.query)('assignedTo')
        .optional()
        .isMongoId()
        .withMessage('Invalid assignedTo ID'),
];
//# sourceMappingURL=dispute.validation.js.map