"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBankListValidation = exports.verifyBankAccountValidation = exports.debitWalletValidation = exports.creditWalletValidation = exports.verifyWalletFundingValidation = exports.initializeWalletFundingValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation for initializing wallet funding
 */
exports.initializeWalletFundingValidation = [
    (0, express_validator_1.body)('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom((value) => {
        if (value < 100) {
            throw new Error('Minimum funding amount is ₦100');
        }
        if (value > 1000000) {
            throw new Error('Maximum funding amount is ₦1,000,000');
        }
        return true;
    }),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];
/**
 * Validation for verifying wallet funding
 */
exports.verifyWalletFundingValidation = [
    (0, express_validator_1.param)('reference')
        .notEmpty()
        .withMessage('Payment reference is required')
        .isString()
        .withMessage('Reference must be a string')
        .isLength({ min: 10 })
        .withMessage('Invalid payment reference'),
];
/**
 * Validation for admin wallet credit
 */
exports.creditWalletValidation = [
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isMongoId()
        .withMessage('Invalid user ID'),
    (0, express_validator_1.body)('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom((value) => {
        if (value <= 0) {
            throw new Error('Amount must be greater than zero');
        }
        if (value > 10000000) {
            throw new Error('Maximum credit amount is ₦10,000,000');
        }
        return true;
    }),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];
/**
 * Validation for admin wallet debit
 */
exports.debitWalletValidation = [
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isMongoId()
        .withMessage('Invalid user ID'),
    (0, express_validator_1.body)('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom((value) => {
        if (value <= 0) {
            throw new Error('Amount must be greater than zero');
        }
        return true;
    }),
    (0, express_validator_1.body)('description')
        .notEmpty()
        .withMessage('Description is required for wallet debit')
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];
exports.verifyBankAccountValidation = [
    (0, express_validator_1.body)('accountNumber')
        .notEmpty()
        .withMessage('Account number is required')
        .isString()
        .withMessage('Account number must be a string')
        .isLength({ min: 10, max: 10 })
        .withMessage('Account number must be 10 digits')
        .matches(/^[0-9]+$/)
        .withMessage('Account number must contain only digits'),
    (0, express_validator_1.body)('bankCode')
        .notEmpty()
        .withMessage('Bank code is required')
        .isString()
        .withMessage('Bank code must be a string'),
];
exports.getBankListValidation = [
    (0, express_validator_1.query)('country')
        .optional()
        .isString()
        .withMessage('Country must be a string')
        .isIn(['nigeria', 'Nigeria', 'NG', 'ng'])
        .withMessage('Only Nigeria is currently supported'),
];
//# sourceMappingURL=walletFunding.validation.js.map