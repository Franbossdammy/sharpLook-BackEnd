import { body, param, query } from 'express-validator';



export const validateReferralCodeValidation = [
  body('referralCode')
    .trim()
    .notEmpty()
    .withMessage('Referral code is required')
    .isLength({ min: 6, max: 10 })
    .withMessage('Referral code must be between 6 and 10 characters')
    .isAlphanumeric()
    .withMessage('Referral code must contain only letters and numbers')
    .toUpperCase(),
];

export const applyReferralCodeValidation = [
  body('referralCode')
    .trim()
    .notEmpty()
    .withMessage('Referral code is required')
    .isLength({ min: 6, max: 12 })
    .withMessage('Referral code must be 6-12 characters')
    .isAlphanumeric()
    .withMessage('Referral code must be alphanumeric'),
];

export const referralIdValidation = [
  param('referralId').isMongoId().withMessage('Invalid referral ID'),
];

export const getReferralsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'expired', 'cancelled'])
    .withMessage('Invalid status'),
];

export const getLeaderboardValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be 1-50'),
];

export const getAdminReferralsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'expired', 'cancelled'])
    .withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];
