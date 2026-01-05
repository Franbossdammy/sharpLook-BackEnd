import { body, param, query } from 'express-validator';

export const createSubscriptionValidation = [
  body('plan')
    .isIn(['in_shop', 'home_service', 'both'])
    .withMessage('Invalid subscription plan'),
];

export const subscriptionIdValidation = [
  param('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
];

export const changePlanValidation = [
  body('plan')
    .isIn(['in_shop', 'home_service', 'both'])
    .withMessage('Invalid subscription plan'),
];

export const getSubscriptionsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status')
    .optional()
    .isIn(['active', 'expired', 'cancelled', 'pending'])
    .withMessage('Invalid status'),
  query('plan')
    .optional()
    .isIn(['in_shop', 'home_service', 'both'])
    .withMessage('Invalid plan'),
];
