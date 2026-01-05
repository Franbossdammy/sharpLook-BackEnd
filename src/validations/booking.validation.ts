import { body, param, query } from 'express-validator';

/**
 * Create booking validation
 */
export const createBookingValidation = [
  body('service')
    .notEmpty()
    .withMessage('Service is required')
    .isMongoId()
    .withMessage('Invalid service ID'),

  body('scheduledDate')
    .notEmpty()
    .withMessage('Scheduled date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Scheduled date cannot be in the past');
      }
      return true;
    }),

  body('scheduledTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (use HH:MM)'),

  body('location.address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address is required when location is provided'),

  body('location.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City is required when location is provided'),

  body('location.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State is required when location is provided'),

  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),

  body('location.coordinates.*')
    .optional()
    .isFloat()
    .withMessage('Coordinates must be valid numbers'),

  body('clientNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Client notes cannot exceed 1000 characters'),
];

export const payFromWalletValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),
];

/**
 * Update booking validation
 */
export const updateBookingValidation = [
  body('clientNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Client notes cannot exceed 1000 characters'),

  body('vendorNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Vendor notes cannot exceed 1000 characters'),
];

/**
 * Reject/Cancel booking validation
 */
export const reasonValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

/**
 * Booking ID param validation
 */
export const bookingIdValidation = [
  param('bookingId').isMongoId().withMessage('Invalid booking ID'),
];

/**
 * Get bookings validation
 */
export const getBookingsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('role')
    .optional()
    .isIn(['client', 'vendor'])
    .withMessage('Role must be client or vendor'),

  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
];

/**
 * Create offer validation
 */
export const createOfferValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 10, max: 100 })
    .withMessage('Title must be between 10 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('service')
    .optional()
    .isMongoId()
    .withMessage('Invalid service ID'),

  body('proposedPrice')
    .notEmpty()
    .withMessage('Proposed price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),

  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),

  body('location.coordinates.*')
    .isFloat()
    .withMessage('Coordinates must be valid numbers'),

  body('preferredDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('preferredTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format (use HH:MM)'),

  body('flexibility')
    .optional()
    .isIn(['flexible', 'specific', 'urgent'])
    .withMessage('Flexibility must be flexible, specific, or urgent'),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),

  body('expiresInDays')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Expiration must be between 1 and 30 days'),
];

/**
 * Respond to offer validation
 */
export const respondToOfferValidation = [
  body('proposedPrice')
    .notEmpty()
    .withMessage('Proposed price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters'),

  body('estimatedDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer (in minutes)'),
];

/**
 * Counter offer validation
 */
export const counterOfferValidation = [
  body('counterPrice')
    .notEmpty()
    .withMessage('Counter price is required')
    .isFloat({ min: 0 })
    .withMessage('Counter price must be a positive number'),
];

/**
 * Offer ID param validation
 */
export const offerIdValidation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID'),
];

/**
 * Response ID param validation
 */
export const responseIdValidation = [
  param('responseId').isMongoId().withMessage('Invalid response ID'),
];

/**
 * Get offers validation
 */
export const getOffersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('category').optional().isMongoId().withMessage('Invalid category ID'),

  query('priceMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('priceMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),

  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),

  query('maxDistance')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max distance must be between 1 and 100 km'),
];
