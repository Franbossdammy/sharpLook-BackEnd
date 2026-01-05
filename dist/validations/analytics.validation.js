"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportTypeValidation = exports.vendorIdQueryValidation = exports.dateRangeValidation = void 0;
const express_validator_1 = require("express-validator");
exports.dateRangeValidation = [
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Invalid end date format'),
];
exports.vendorIdQueryValidation = [
    (0, express_validator_1.query)('vendorId').optional().isMongoId().withMessage('Invalid vendor ID'),
];
exports.exportTypeValidation = [
    (0, express_validator_1.param)('type')
        .isIn(['users', 'bookings', 'revenue', 'vendors', 'services', 'disputes', 'referrals'])
        .withMessage('Invalid export type'),
];
//# sourceMappingURL=analytics.validation.js.map