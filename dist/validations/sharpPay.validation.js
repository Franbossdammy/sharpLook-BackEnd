"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWithdrawalsValidation = exports.rejectWithdrawalValidation = exports.withdrawalIdValidation = exports.requestWithdrawalValidation = exports.getTransactionsValidation = exports.verifyDepositValidation = exports.initializeDepositValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Initialize deposit validation
 */
exports.initializeDepositValidation = [
    (0, express_validator_1.body)('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .isFloat({ min: 100 })
        .withMessage('Minimum deposit is ₦100'),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];
/**
 * Verify deposit validation
 */
exports.verifyDepositValidation = [
    (0, express_validator_1.param)('reference')
        .notEmpty()
        .withMessage('Reference is required')
        .isString()
        .withMessage('Reference must be a string'),
];
/**
 * Get transactions validation
 */
exports.getTransactionsValidation = [
    (0, express_validator_1.query)('type')
        .optional()
        .isString()
        .withMessage('Type must be a string'),
    (0, express_validator_1.query)('status')
        .optional()
        .isString()
        .withMessage('Status must be a string'),
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
];
/**
 * Request withdrawal validation
 */
exports.requestWithdrawalValidation = [
    (0, express_validator_1.body)('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .isFloat({ min: 1000 })
        .withMessage('Minimum withdrawal is ₦1,000'),
    (0, express_validator_1.body)('bankName')
        .notEmpty()
        .withMessage('Bank name is required')
        .isString()
        .withMessage('Bank name must be a string'),
    (0, express_validator_1.body)('accountNumber')
        .notEmpty()
        .withMessage('Account number is required')
        .isString()
        .withMessage('Account number must be a string')
        .isLength({ min: 10, max: 10 })
        .withMessage('Account number must be 10 digits'),
    (0, express_validator_1.body)('accountName')
        .notEmpty()
        .withMessage('Account name is required')
        .isString()
        .withMessage('Account name must be a string'),
    (0, express_validator_1.body)('pin')
        .notEmpty()
        .withMessage('Withdrawal PIN is required')
        .isString()
        .withMessage('PIN must be a string')
        .matches(/^\d{4,6}$/)
        .withMessage('PIN must be 4-6 digits'),
];
/**
 * Withdrawal ID validation
 */
exports.withdrawalIdValidation = [
    (0, express_validator_1.param)('withdrawalId')
        .notEmpty()
        .withMessage('Withdrawal ID is required')
        .isMongoId()
        .withMessage('Invalid withdrawal ID'),
];
/**
 * Reject withdrawal validation
 */
exports.rejectWithdrawalValidation = [
    (0, express_validator_1.body)('reason')
        .notEmpty()
        .withMessage('Rejection reason is required')
        .isString()
        .withMessage('Reason must be a string')
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
];
/**
 * Get withdrawals validation (Admin)
 */
exports.getWithdrawalsValidation = [
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'processing', 'completed', 'failed', 'rejected'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
];
//# sourceMappingURL=sharpPay.validation.js.map