"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalateDisputeValidation = exports.closeDisputeValidation = exports.resolveDisputeValidation = exports.assignDisputeValidation = exports.addMessageValidation = exports.getDisputesValidation = exports.disputeIdValidation = exports.createDisputeValidation = void 0;
const express_validator_1 = require("express-validator");
const DisputeProduct_1 = require("../models/DisputeProduct");
/**
 * Create dispute validation
 */
exports.createDisputeValidation = [
    (0, express_validator_1.body)('order')
        .notEmpty()
        .withMessage('Order ID is required')
        .isMongoId()
        .withMessage('Invalid order ID'),
    (0, express_validator_1.body)('product')
        .optional()
        .isMongoId()
        .withMessage('Invalid product ID'),
    (0, express_validator_1.body)('reason')
        .notEmpty()
        .withMessage('Dispute reason is required')
        .isIn(Object.values(DisputeProduct_1.DisputeReason))
        .withMessage('Invalid dispute reason'),
    (0, express_validator_1.body)('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 20, max: 2000 })
        .withMessage('Description must be between 20 and 2000 characters'),
];
/**
 * Dispute ID validation
 */
exports.disputeIdValidation = [
    (0, express_validator_1.param)('disputeId').isMongoId().withMessage('Invalid dispute ID'),
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
        .isIn(Object.values(DisputeProduct_1.DisputeStatus))
        .withMessage('Invalid dispute status'),
    (0, express_validator_1.query)('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Invalid priority'),
    (0, express_validator_1.query)('reason')
        .optional()
        .isIn(Object.values(DisputeProduct_1.DisputeReason))
        .withMessage('Invalid dispute reason'),
    (0, express_validator_1.query)('assignedTo')
        .optional()
        .isMongoId()
        .withMessage('Invalid admin ID'),
    (0, express_validator_1.query)('role')
        .optional()
        .isIn(['customer', 'seller'])
        .withMessage('Role must be either customer or seller'),
];
/**
 * Add message validation
 */
exports.addMessageValidation = [
    (0, express_validator_1.param)('disputeId').isMongoId().withMessage('Invalid dispute ID'),
    (0, express_validator_1.body)('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
];
/**
 * Assign dispute validation
 */
exports.assignDisputeValidation = [
    (0, express_validator_1.param)('disputeId').isMongoId().withMessage('Invalid dispute ID'),
    (0, express_validator_1.body)('adminId')
        .optional()
        .isMongoId()
        .withMessage('Invalid admin ID'),
];
/**
 * Resolve dispute validation
 */
exports.resolveDisputeValidation = [
    (0, express_validator_1.param)('disputeId').isMongoId().withMessage('Invalid dispute ID'),
    (0, express_validator_1.body)('resolution')
        .notEmpty()
        .withMessage('Resolution is required')
        .isIn(Object.values(DisputeProduct_1.DisputeResolution))
        .withMessage('Invalid resolution type'),
    (0, express_validator_1.body)('resolutionNote')
        .trim()
        .notEmpty()
        .withMessage('Resolution note is required')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Resolution note must be between 10 and 1000 characters'),
    (0, express_validator_1.body)('refundAmount')
        .if((0, express_validator_1.body)('resolution').equals(DisputeProduct_1.DisputeResolution.PARTIAL_REFUND))
        .notEmpty()
        .withMessage('Refund amount is required for partial refund')
        .isFloat({ min: 0 })
        .withMessage('Refund amount must be a positive number'),
];
/**
 * Close dispute validation
 */
exports.closeDisputeValidation = [
    (0, express_validator_1.param)('disputeId').isMongoId().withMessage('Invalid dispute ID'),
    (0, express_validator_1.body)('closureNote')
        .trim()
        .notEmpty()
        .withMessage('Closure note is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Closure note must be between 10 and 500 characters'),
];
/**
 * Escalate dispute validation
 */
exports.escalateDisputeValidation = [
    (0, express_validator_1.param)('disputeId').isMongoId().withMessage('Invalid dispute ID'),
    (0, express_validator_1.body)('reason')
        .trim()
        .notEmpty()
        .withMessage('Escalation reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Escalation reason must be between 10 and 500 characters'),
];
//# sourceMappingURL=disputeProduct.validation.js.map