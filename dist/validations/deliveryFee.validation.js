"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDeliveryFeeValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation for calculating delivery fee preview
 */
exports.calculateDeliveryFeeValidation = [
    (0, express_validator_1.query)('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .isMongoId()
        .withMessage('Invalid product ID format'),
    (0, express_validator_1.query)('latitude')
        .notEmpty()
        .withMessage('Latitude is required')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.query)('longitude')
        .notEmpty()
        .withMessage('Longitude is required')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
];
// Add this to your existing order.validation.ts file
// Or update your createOrderValidation to include coordinates validation
//# sourceMappingURL=deliveryFee.validation.js.map