"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOffersValidation = exports.responseIdValidation = exports.offerIdValidation = exports.counterOfferValidation = exports.respondToOfferValidation = exports.createOfferValidation = exports.getBookingsValidation = exports.bookingIdValidation = exports.reasonValidation = exports.updateBookingValidation = exports.payFromWalletValidation = exports.createBookingValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Create booking validation
 */
exports.createBookingValidation = [
    (0, express_validator_1.body)('service')
        .notEmpty()
        .withMessage('Service is required')
        .isMongoId()
        .withMessage('Invalid service ID'),
    (0, express_validator_1.body)('scheduledDate')
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
    (0, express_validator_1.body)('scheduledTime')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Invalid time format (use HH:MM)'),
    (0, express_validator_1.body)('location.address')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Address is required when location is provided'),
    (0, express_validator_1.body)('location.city')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('City is required when location is provided'),
    (0, express_validator_1.body)('location.state')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('State is required when location is provided'),
    (0, express_validator_1.body)('location.coordinates')
        .optional()
        .isArray({ min: 2, max: 2 })
        .withMessage('Coordinates must be [longitude, latitude]'),
    (0, express_validator_1.body)('location.coordinates.*')
        .optional()
        .isFloat()
        .withMessage('Coordinates must be valid numbers'),
    (0, express_validator_1.body)('clientNotes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Client notes cannot exceed 1000 characters'),
];
exports.payFromWalletValidation = [
    (0, express_validator_1.body)('bookingId')
        .notEmpty()
        .withMessage('Booking ID is required')
        .isMongoId()
        .withMessage('Invalid booking ID'),
];
/**
 * Update booking validation
 */
exports.updateBookingValidation = [
    (0, express_validator_1.body)('clientNotes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Client notes cannot exceed 1000 characters'),
    (0, express_validator_1.body)('vendorNotes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Vendor notes cannot exceed 1000 characters'),
];
/**
 * Reject/Cancel booking validation
 */
exports.reasonValidation = [
    (0, express_validator_1.body)('reason')
        .optional()
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
];
/**
 * Booking ID param validation
 */
exports.bookingIdValidation = [
    (0, express_validator_1.param)('bookingId').isMongoId().withMessage('Invalid booking ID'),
];
/**
 * Get bookings validation
 */
exports.getBookingsValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('role')
        .optional()
        .isIn(['client', 'vendor'])
        .withMessage('Role must be client or vendor'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
];
/**
 * Create offer validation
 */
exports.createOfferValidation = [
    (0, express_validator_1.body)('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 10, max: 100 })
        .withMessage('Title must be between 10 and 100 characters'),
    (0, express_validator_1.body)('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 20, max: 1000 })
        .withMessage('Description must be between 20 and 1000 characters'),
    (0, express_validator_1.body)('category')
        .notEmpty()
        .withMessage('Category is required')
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.body)('service')
        .optional()
        .isMongoId()
        .withMessage('Invalid service ID'),
    (0, express_validator_1.body)('proposedPrice')
        .notEmpty()
        .withMessage('Proposed price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('location.address')
        .trim()
        .notEmpty()
        .withMessage('Address is required'),
    (0, express_validator_1.body)('location.city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),
    (0, express_validator_1.body)('location.state')
        .trim()
        .notEmpty()
        .withMessage('State is required'),
    (0, express_validator_1.body)('location.coordinates')
        .isArray({ min: 2, max: 2 })
        .withMessage('Coordinates must be [longitude, latitude]'),
    (0, express_validator_1.body)('location.coordinates.*')
        .isFloat()
        .withMessage('Coordinates must be valid numbers'),
    (0, express_validator_1.body)('preferredDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    (0, express_validator_1.body)('preferredTime')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Invalid time format (use HH:MM)'),
    (0, express_validator_1.body)('flexibility')
        .optional()
        .isIn(['flexible', 'specific', 'urgent'])
        .withMessage('Flexibility must be flexible, specific, or urgent'),
    (0, express_validator_1.body)('images')
        .optional()
        .isArray({ max: 5 })
        .withMessage('Maximum 5 images allowed'),
    (0, express_validator_1.body)('images.*')
        .optional()
        .isURL()
        .withMessage('Each image must be a valid URL'),
    (0, express_validator_1.body)('expiresInDays')
        .optional()
        .isInt({ min: 1, max: 30 })
        .withMessage('Expiration must be between 1 and 30 days'),
];
/**
 * Respond to offer validation
 */
exports.respondToOfferValidation = [
    (0, express_validator_1.body)('proposedPrice')
        .notEmpty()
        .withMessage('Proposed price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('message')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Message cannot exceed 500 characters'),
    (0, express_validator_1.body)('estimatedDuration')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Duration must be a positive integer (in minutes)'),
];
/**
 * Counter offer validation
 */
exports.counterOfferValidation = [
    (0, express_validator_1.body)('counterPrice')
        .notEmpty()
        .withMessage('Counter price is required')
        .isFloat({ min: 0 })
        .withMessage('Counter price must be a positive number'),
];
/**
 * Offer ID param validation
 */
exports.offerIdValidation = [
    (0, express_validator_1.param)('offerId').isMongoId().withMessage('Invalid offer ID'),
];
/**
 * Response ID param validation
 */
exports.responseIdValidation = [
    (0, express_validator_1.param)('responseId').isMongoId().withMessage('Invalid response ID'),
];
/**
 * Get offers validation
 */
exports.getOffersValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('category').optional().isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.query)('priceMin')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be a positive number'),
    (0, express_validator_1.query)('priceMax')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be a positive number'),
    (0, express_validator_1.query)('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
    (0, express_validator_1.query)('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),
    (0, express_validator_1.query)('maxDistance')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Max distance must be between 1 and 100 km'),
];
//# sourceMappingURL=booking.validation.js.map