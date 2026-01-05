"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWithdrawalsValidation = exports.getTransactionsValidation = exports.rejectWithdrawalValidation = exports.withdrawalIdValidation = exports.withdrawalRequestValidation = exports.paymentIdValidation = exports.paymentReferenceValidation = exports.initializePaymentValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Initialize payment validation
 */
exports.initializePaymentValidation = [
    (0, express_validator_1.body)('bookingId')
        .notEmpty()
        .withMessage('Booking ID is required')
        .isMongoId()
        .withMessage('Invalid booking ID'),
    (0, express_validator_1.body)('metadata').optional().isObject().withMessage('Metadata must be an object'),
];
/**
 * Payment reference param validation
 */
exports.paymentReferenceValidation = [
    (0, express_validator_1.param)('reference').trim().notEmpty().withMessage('Payment reference is required'),
];
/**
 * Payment ID param validation
 */
exports.paymentIdValidation = [
    (0, express_validator_1.param)('paymentId').isMongoId().withMessage('Invalid payment ID'),
];
/**
 * Withdrawal request validation
 */
exports.withdrawalRequestValidation = [
    (0, express_validator_1.body)('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ min: 1000 })
        .withMessage('Minimum withdrawal is ₦1,000'),
    (0, express_validator_1.body)('bankName').trim().notEmpty().withMessage('Bank name is required'),
    (0, express_validator_1.body)('accountNumber')
        .trim()
        .notEmpty()
        .withMessage('Account number is required')
        .matches(/^\d{10}$/)
        .withMessage('Account number must be 10 digits'),
    (0, express_validator_1.body)('accountName').trim().notEmpty().withMessage('Account name is required'),
    (0, express_validator_1.body)('pin')
        .notEmpty()
        .withMessage('Withdrawal PIN is required')
        .matches(/^\d{4,6}$/)
        .withMessage('PIN must be 4-6 digits'),
];
/**
 * Withdrawal ID param validation
 */
exports.withdrawalIdValidation = [
    (0, express_validator_1.param)('withdrawalId').isMongoId().withMessage('Invalid withdrawal ID'),
];
/**
 * Reject withdrawal validation
 */
exports.rejectWithdrawalValidation = [
    (0, express_validator_1.body)('reason')
        .trim()
        .notEmpty()
        .withMessage('Rejection reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
];
/**
 * Get transactions validation
 */
exports.getTransactionsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['deposit', 'withdrawal', 'booking_payment', 'refund', 'commission', 'referral_bonus'])
        .withMessage('Invalid transaction type'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'completed', 'failed', 'refunded'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Invalid end date format'),
];
/**
 * Get withdrawals validation (admin)
 */
exports.getWithdrawalsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'processing', 'completed', 'failed', 'rejected'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Invalid end date format'),
];
//# sourceMappingURL=payment.validation.js.map