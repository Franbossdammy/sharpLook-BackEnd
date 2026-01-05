"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocumentValidation = exports.updateLocationValidation = exports.updateAvailabilityValidation = exports.updateVendorProfileValidation = void 0;
// ============================================
// vendor.validation.ts
// ============================================
const express_validator_1 = require("express-validator");
exports.updateVendorProfileValidation = [
    (0, express_validator_1.body)('businessName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('businessDescription')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Business description cannot exceed 1000 characters'),
    (0, express_validator_1.body)('vendorType')
        .optional()
        .isIn(['home_service', 'in_shop', 'both'])
        .withMessage('Invalid vendor type'),
    (0, express_validator_1.body)('categories')
        .optional()
        .isArray()
        .withMessage('Categories must be an array'),
    (0, express_validator_1.body)('categories.*')
        .optional()
        .isMongoId()
        .withMessage('Invalid category ID'),
    (0, express_validator_1.body)('location')
        .optional()
        .custom((value) => {
        if (!value)
            return true;
        if (value.type !== 'Point') {
            throw new Error('Location type must be "Point"');
        }
        if (!Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
            throw new Error('Coordinates must be [longitude, latitude]');
        }
        const [longitude, latitude] = value.coordinates;
        if (typeof longitude !== 'number' ||
            typeof latitude !== 'number' ||
            longitude < -180 || longitude > 180 ||
            latitude < -90 || latitude > 90) {
            throw new Error('Invalid coordinates');
        }
        if (!value.address || !value.city || !value.state || !value.country) {
            throw new Error('Address, city, state, and country are required');
        }
        return true;
    }),
    (0, express_validator_1.body)('serviceRadius')
        .optional()
        .isNumeric()
        .withMessage('Service radius must be a number')
        .isFloat({ min: 1, max: 100 })
        .withMessage('Service radius must be between 1 and 100 km'),
];
exports.updateAvailabilityValidation = [
    (0, express_validator_1.body)('schedule')
        .notEmpty()
        .withMessage('Schedule is required')
        .isObject()
        .withMessage('Schedule must be an object'),
    (0, express_validator_1.body)('schedule.*.isAvailable')
        .optional()
        .isBoolean()
        .withMessage('isAvailable must be a boolean'),
    (0, express_validator_1.body)('schedule.*.from')
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Time must be in HH:MM format'),
    (0, express_validator_1.body)('schedule.*.to')
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Time must be in HH:MM format'),
];
exports.updateLocationValidation = [
    (0, express_validator_1.body)('location')
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
        if (typeof longitude !== 'number' ||
            typeof latitude !== 'number' ||
            longitude < -180 || longitude > 180 ||
            latitude < -90 || latitude > 90) {
            throw new Error('Invalid coordinates');
        }
        if (!value.address || !value.city || !value.state || !value.country) {
            throw new Error('Address, city, state, and country are required');
        }
        return true;
    }),
    (0, express_validator_1.body)('serviceRadius')
        .optional()
        .isNumeric()
        .withMessage('Service radius must be a number')
        .isFloat({ min: 1, max: 100 })
        .withMessage('Service radius must be between 1 and 100 km'),
];
exports.uploadDocumentValidation = [
    (0, express_validator_1.body)('documentType')
        .notEmpty()
        .withMessage('Document type is required')
        .isIn(['idCard', 'businessLicense', 'certification'])
        .withMessage('Invalid document type'),
    (0, express_validator_1.body)('documentUrl')
        .notEmpty()
        .withMessage('Document URL is required')
        .isURL()
        .withMessage('Invalid document URL'),
];
//# sourceMappingURL=vendor.validation.js.map