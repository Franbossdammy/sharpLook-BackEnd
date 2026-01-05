import { body, param, query } from 'express-validator';

/**
 * Initialize deposit validation
 */
export const initializeDepositValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 100 })
    .withMessage('Minimum deposit is ₦100'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

/**
 * Verify deposit validation
 */
export const verifyDepositValidation = [
  param('reference')
    .notEmpty()
    .withMessage('Reference is required')
    .isString()
    .withMessage('Reference must be a string'),
];

/**
 * Get transactions validation
 */
export const getTransactionsValidation = [
  query('type')
    .optional()
    .isString()
    .withMessage('Type must be a string'),
  query('status')
    .optional()
    .isString()
    .withMessage('Status must be a string'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
];

/**
 * Request withdrawal validation
 */
export const requestWithdrawalValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 1000 })
    .withMessage('Minimum withdrawal is ₦1,000'),
  body('bankName')
    .notEmpty()
    .withMessage('Bank name is required')
    .isString()
    .withMessage('Bank name must be a string'),
  body('accountNumber')
    .notEmpty()
    .withMessage('Account number is required')
    .isString()
    .withMessage('Account number must be a string')
    .isLength({ min: 10, max: 10 })
    .withMessage('Account number must be 10 digits'),
  body('accountName')
    .notEmpty()
    .withMessage('Account name is required')
    .isString()
    .withMessage('Account name must be a string'),
  body('pin')
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
export const withdrawalIdValidation = [
  param('withdrawalId')
    .notEmpty()
    .withMessage('Withdrawal ID is required')
    .isMongoId()
    .withMessage('Invalid withdrawal ID'),
];

/**
 * Reject withdrawal validation
 */
export const rejectWithdrawalValidation = [
  body('reason')
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
export const getWithdrawalsValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'rejected'])
    .withMessage('Invalid status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
];