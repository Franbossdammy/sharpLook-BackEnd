import { param, query } from 'express-validator';

export const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
];

export const vendorIdQueryValidation = [
  query('vendorId').optional().isMongoId().withMessage('Invalid vendor ID'),
];

export const exportTypeValidation = [
  param('type')
    .isIn(['users', 'bookings', 'revenue', 'vendors', 'services', 'disputes', 'referrals'])
    .withMessage('Invalid export type'),
];
