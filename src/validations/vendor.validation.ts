// ============================================
// vendor.validation.ts
// ============================================
import { body } from 'express-validator';

export const updateVendorProfileValidation = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),

  body('businessDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Business description cannot exceed 1000 characters'),

  body('vendorType')
    .optional()
    .isIn(['home_service', 'in_shop', 'both'])
    .withMessage('Invalid vendor type'),

  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),

  body('categories.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('location')
    .optional()
    .custom((value) => {
      if (!value) return true;

      if (value.type !== 'Point') {
        throw new Error('Location type must be "Point"');
      }

      if (!Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
        throw new Error('Coordinates must be [longitude, latitude]');
      }

      const [longitude, latitude] = value.coordinates;
      if (
        typeof longitude !== 'number' ||
        typeof latitude !== 'number' ||
        longitude < -180 || longitude > 180 ||
        latitude < -90 || latitude > 90
      ) {
        throw new Error('Invalid coordinates');
      }

      if (!value.address || !value.city || !value.state || !value.country) {
        throw new Error('Address, city, state, and country are required');
      }

      return true;
    }),

  body('serviceRadius')
    .optional()
    .isNumeric()
    .withMessage('Service radius must be a number')
    .isFloat({ min: 1, max: 100 })
    .withMessage('Service radius must be between 1 and 100 km'),
];

export const updateAvailabilityValidation = [
  body('schedule')
    .notEmpty()
    .withMessage('Schedule is required')
    .isObject()
    .withMessage('Schedule must be an object'),

  body('schedule.*.isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),

  body('schedule.*.from')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Time must be in HH:MM format'),

  body('schedule.*.to')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Time must be in HH:MM format'),
];

export const updateLocationValidation = [
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .custom((value) => {
      if (value.type !== 'Point') {
        throw new Error('Location type must be "Point"');
      }

      if (!Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
        throw new Error('Coordinates must be [longitude, latitude]');
      }

      const [longitude, latitude] = value.coordinates;
      if (
        typeof longitude !== 'number' ||
        typeof latitude !== 'number' ||
        longitude < -180 || longitude > 180 ||
        latitude < -90 || latitude > 90
      ) {
        throw new Error('Invalid coordinates');
      }

      if (!value.address || !value.city || !value.state || !value.country) {
        throw new Error('Address, city, state, and country are required');
      }

      return true;
    }),

  body('serviceRadius')
    .optional()
    .isNumeric()
    .withMessage('Service radius must be a number')
    .isFloat({ min: 1, max: 100 })
    .withMessage('Service radius must be between 1 and 100 km'),
];

export const uploadDocumentValidation = [
  body('documentType')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['idCard', 'businessLicense', 'certification'])
    .withMessage('Invalid document type'),

  body('documentUrl')
    .notEmpty()
    .withMessage('Document URL is required')
    .isURL()
    .withMessage('Invalid document URL'),
];