import { body, param, query } from 'express-validator';

/**
 * Initialize payment validation
 */
export const initializePaymentValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),

  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
];

/**
 * Payment reference param validation
 */
export const paymentReferenceValidation = [
  param('reference').trim().notEmpty().withMessage('Payment reference is required'),
];

/**
 * Payment ID param validation
 */
export const paymentIdValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
];

/**
 * Withdrawal request validation
 */
export const withdrawalRequestValidation = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 1000 })
    .withMessage('Minimum withdrawal is ₦1,000'),

  body('bankName').trim().notEmpty().withMessage('Bank name is required'),

  body('accountNumber')
    .trim()
    .notEmpty()
    .withMessage('Account number is required')
    .matches(/^\d{10}$/)
    .withMessage('Account number must be 10 digits'),

  body('accountName').trim().notEmpty().withMessage('Account name is required'),

  body('pin')
    .notEmpty()
    .withMessage('Withdrawal PIN is required')
    .matches(/^\d{4,6}$/)
    .withMessage('PIN must be 4-6 digits'),
];

/**
 * Withdrawal ID param validation
 */
export const withdrawalIdValidation = [
  param('withdrawalId').isMongoId().withMessage('Invalid withdrawal ID'),
];

/**
 * Reject withdrawal validation
 */
export const rejectWithdrawalValidation = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

/**
 * Get transactions validation
 */
export const getTransactionsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('type')
    .optional()
    .isIn(['deposit', 'withdrawal', 'booking_payment', 'refund', 'commission', 'referral_bonus'])
    .withMessage('Invalid transaction type'),

  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid status'),

  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),

  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
];

/**
 * Get withdrawals validation (admin)
 */
export const getWithdrawalsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'rejected'])
    .withMessage('Invalid status'),

  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),

  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
];
