import { body, param, query } from 'express-validator';

export const createReviewValidation = [
  body('bookingId').notEmpty().isMongoId().withMessage('Invalid booking ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('title').optional().trim().isLength({ max: 100 }),
  body('comment').trim().isLength({ min: 10, max: 1000 }),
  body('detailedRatings.serviceQuality').optional().isInt({ min: 1, max: 5 }),
  body('detailedRatings.communication').optional().isInt({ min: 1, max: 5 }),
  body('detailedRatings.punctuality').optional().isInt({ min: 1, max: 5 }),
  body('detailedRatings.professionalism').optional().isInt({ min: 1, max: 5 }),
  body('detailedRatings.valueForMoney').optional().isInt({ min: 1, max: 5 }),
  body('images').optional().isArray(),
  body('images.*').optional().isURL(),
];

export const respondToReviewValidation = [
  body('comment').trim().notEmpty().isLength({ min: 10, max: 500 }),
];

export const voteHelpfulValidation = [
  body('isHelpful').isBoolean().withMessage('isHelpful must be boolean'),
];

export const flagReviewValidation = [
  body('reason').trim().notEmpty().isLength({ min: 10, max: 200 }),
];

export const hideReviewValidation = [
  body('reason').trim().notEmpty().isLength({ min: 10, max: 500 }),
];

export const reviewIdValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
];

export const userIdValidation = [
  param('userId').isMongoId().withMessage('Invalid user ID'),
];

export const serviceIdValidation = [
  param('serviceId').isMongoId().withMessage('Invalid service ID'),
];

export const getReviewsValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('rating').optional().isInt({ min: 1, max: 5 }),
  query('minRating').optional().isInt({ min: 1, max: 5 }),
  query('isFlagged').optional().isBoolean(),
  query('isApproved').optional().isBoolean(),
];
