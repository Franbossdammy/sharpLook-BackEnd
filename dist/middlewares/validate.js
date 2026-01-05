"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSort = exports.validatePagination = exports.sanitizeBody = exports.validate = void 0;
const express_validator_1 = require("express-validator");
const errors_1 = require("../utils/errors");
/**
 * Validate request using express-validator rules
 */
const validate = (validations) => {
    return async (req, _res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));
        // Check for errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (errors.isEmpty()) {
            return next();
        }
        // Format errors
        const formattedErrors = errors.array().map((error) => ({
            field: error.type === 'field' ? error.path : undefined,
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined,
        }));
        // Send validation error response
        return next(new errors_1.ValidationError('Validation failed', formattedErrors));
    };
};
exports.validate = validate;
/**
 * Sanitize request body to prevent NoSQL injection
 */
const sanitizeBody = (req, _res, next) => {
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    next();
};
exports.sanitizeBody = sanitizeBody;
/**
 * Sanitize an object recursively
 */
const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    const sanitized = {};
    for (const key in obj) {
        // Remove keys that start with '$' (MongoDB operators)
        if (key.startsWith('$')) {
            continue;
        }
        sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
};
/**
 * Validate pagination parameters
 */
const validatePagination = (req, _res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    // Ensure page and limit are positive integers
    if (page < 1) {
        return next(new errors_1.ValidationError('Page must be a positive integer'));
    }
    if (limit < 1 || limit > 100) {
        return next(new errors_1.ValidationError('Limit must be between 1 and 100'));
    }
    // Attach to request
    req.query.page = page.toString();
    req.query.limit = limit.toString();
    next();
};
exports.validatePagination = validatePagination;
/**
 * Validate sort parameters
 */
const validateSort = (req, _res, next) => {
    const sortOrder = req.query.sortOrder?.toLowerCase();
    if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
        return next(new errors_1.ValidationError('Sort order must be either "asc" or "desc"'));
    }
    next();
};
exports.validateSort = validateSort;
//# sourceMappingURL=validate.js.map