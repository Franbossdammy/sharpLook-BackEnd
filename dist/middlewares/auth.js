"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAnalyticsAdmin = exports.requireFinancialAdmin = exports.requireSuperAdmin = exports.requireAdmin = exports.optionalAuth = exports.requireVendor = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const errors_1 = require("../utils/errors");
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, _res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('No token provided');
        }
        const token = authHeader.split(' ')[1];
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        // Check if user still exists
        const user = await User_1.default.findById(decoded.id).select('+refreshToken');
        if (!user) {
            throw new errors_1.UnauthorizedError('User no longer exists');
        }
        // Check if user is active
        if (user.status !== 'active' && user.status !== 'pending_verification') {
            throw new errors_1.UnauthorizedError('Your account has been deactivated');
        }
        // Check if account is locked
        if (user.isAccountLocked()) {
            throw new errors_1.UnauthorizedError('Your account is temporarily locked due to multiple failed login attempts');
        }
        // Attach user to request
        req.user = {
            _id: mongoose_1.default.Types.ObjectId.createFromHexString(decoded.id),
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            isVendor: user.isVendor || false,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.UnauthorizedError('Invalid token'));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.UnauthorizedError('Token expired'));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
/**
 * Check if user has required role
 */
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError('Authentication required'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new errors_1.ForbiddenError('You do not have permission to perform this action'));
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Check if user is a vendor
 */
const requireVendor = async (req, _res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.UnauthorizedError('Authentication required');
        }
        const user = await User_1.default.findById(req.user.id);
        if (!user || !user.isVendor) {
            throw new errors_1.ForbiddenError('This action requires a vendor account');
        }
        if (!user.vendorProfile?.isVerified) {
            throw new errors_1.ForbiddenError('Your vendor account is not verified');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireVendor = requireVendor;
/**
 * Optional authentication - doesn't throw error if no token
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        const user = await User_1.default.findById(decoded.id);
        if (user && user.status === 'active') {
            req.user = {
                _id: mongoose_1.default.Types.ObjectId.createFromHexString(decoded.id),
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                isVendor: user.isVendor || false,
            };
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Check if user is admin (any admin role)
 */
exports.requireAdmin = (0, exports.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN, types_1.UserRole.FINANCIAL_ADMIN, types_1.UserRole.ANALYTICS_ADMIN, types_1.UserRole.SUPPORT);
/**
 * Check if user is super admin only
 */
exports.requireSuperAdmin = (0, exports.authorize)(types_1.UserRole.SUPER_ADMIN);
/**
 * Check if user is financial admin
 */
exports.requireFinancialAdmin = (0, exports.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.FINANCIAL_ADMIN);
/**
 * Check if user is analytics admin
 */
exports.requireAnalyticsAdmin = (0, exports.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ANALYTICS_ADMIN);
//# sourceMappingURL=auth.js.map