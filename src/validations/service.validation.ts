import { body, param, query } from 'express-validator';

/**
 * Create service validation - Updated for multipart/form-data
 */
export const createServiceValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('subCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid subcategory ID'),

  body('basePrice')
    .notEmpty()
    .withMessage('Base price is required')
    .custom((value) => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue) || numValue < 0) {
        throw new Error('Price must be a positive number');
      }
      return true;
    }),

  body('priceType')
    .optional()
    .isIn(['fixed', 'variable', 'hourly', 'negotiable'])
    .withMessage('Price type must be fixed, variable, hourly, or negotiable'),

  body('currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),

  body('duration')
    .optional()
    .custom((value) => {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (value && (isNaN(numValue) || numValue < 0)) {
        throw new Error('Duration must be a positive integer (in minutes)');
      }
      return true;
    }),

  body('serviceArea')
    .optional()
    .custom((value) => {
      try {
        if (typeof value === 'string') {
          const parsed = JSON.parse(value);
          if (!parsed.type || !parsed.coordinates || !Array.isArray(parsed.coordinates)) {
            throw new Error('Invalid service area structure');
          }
        }
        return true;
      } catch {
        throw new Error('Service area must be valid JSON');
      }
    }),

  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new Error('Tags must be an array');
          }
        } catch {
          throw new Error('Tags must be valid JSON array');
        }
      }
      return true;
    }),
];

/**
 * Update service validation
 */
export const updateServiceValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('subCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid subcategory ID'),

  body('basePrice')
    .optional()
    .custom((value) => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue) || numValue < 0) {
        throw new Error('Price must be a positive number');
      }
      return true;
    }),

  body('priceType')
    .optional()
    .isIn(['fixed', 'variable', 'hourly', 'negotiable'])
    .withMessage('Price type must be fixed, variable, hourly, or negotiable'),

  body('duration')
    .optional()
    .custom((value) => {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      if (value && (isNaN(numValue) || numValue < 0)) {
        throw new Error('Duration must be a positive integer');
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('serviceArea')
    .optional()
    .custom((value) => {
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        }
        return true;
      } catch {
        throw new Error('Service area must be valid JSON');
      }
    }),
];

/**
 * Service ID param validation
 */
export const serviceIdValidation = [
  param('serviceId').isMongoId().withMessage('Invalid service ID'),
];

/**
 * Service slug param validation
 */
export const serviceSlugValidation = [
  param('slug').trim().notEmpty().withMessage('Slug is required'),
];

/**
 * Get services validation
 */
export const getServicesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('vendor')
    .optional()
    .isMongoId()
    .withMessage('Invalid vendor ID'),

  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  query('subCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid subcategory ID'),

  query('priceMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('priceMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  query('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),

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

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'basePrice', 'metadata.averageRating', 'metadata.bookings'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 }),

  query('approvalStatus')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Approval status must be pending, approved, or rejected'),
];

/**
 * Add review validation
 */
export const addReviewValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
];

/**
 * Respond to review validation
 */
export const respondToReviewValidation = [
  body('response')
    .trim()
    .notEmpty()
    .withMessage('Response is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Response must be between 10 and 500 characters'),
];

/**
 * Review ID param validation
 */
export const reviewIdValidation = [
  param('reviewId').isMongoId().withMessage('Invalid review ID'),
];

/**
 * Approve service validation
 */
export const approveServiceValidation = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Approval notes cannot exceed 500 characters'),
];

/**
 * Reject service validation
 */
export const rejectServiceValidation = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];