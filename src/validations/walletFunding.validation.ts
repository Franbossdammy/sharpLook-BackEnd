import { body, param, query } from 'express-validator';

/**
 * Validation for initializing wallet funding
 */
export const initializeWalletFundingValidation = [
  body('amount')
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
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

/**
 * Validation for verifying wallet funding
 */
export const verifyWalletFundingValidation = [
  param('reference')
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
export const creditWalletValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('amount')
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
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

/**
 * Validation for admin wallet debit
 */
export const debitWalletValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('amount')
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
  body('description')
    .notEmpty()
    .withMessage('Description is required for wallet debit')
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];


export const verifyBankAccountValidation = [
  body('accountNumber')
    .notEmpty()
    .withMessage('Account number is required')
    .isString()
    .withMessage('Account number must be a string')
    .isLength({ min: 10, max: 10 })
    .withMessage('Account number must be 10 digits')
    .matches(/^[0-9]+$/)
    .withMessage('Account number must contain only digits'),

  body('bankCode')
    .notEmpty()
    .withMessage('Bank code is required')
    .isString()
    .withMessage('Bank code must be a string'),
];

export const getBankListValidation = [
  query('country')
    .optional()
    .isString()
    .withMessage('Country must be a string')
    .isIn(['nigeria', 'Nigeria', 'NG', 'ng'])
    .withMessage('Only Nigeria is currently supported'),
];