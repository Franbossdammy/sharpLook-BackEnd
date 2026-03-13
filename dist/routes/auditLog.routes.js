"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditLog_controller_1 = __importDefault(require("../controllers/auditLog.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/audit-logs
 * @desc    Get all audit logs
 * @access  Private (Admin)
 */
router.get('/', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, auditLog_controller_1.default.getAll);
/**
 * @route   GET /api/v1/audit-logs/:resource/:resourceId
 * @desc    Get audit logs for a specific resource
 * @access  Private (Admin)
 */
router.get('/:resource/:resourceId', auth_1.authenticate, auth_1.requireAdmin, auditLog_controller_1.default.getByResource);
exports.default = router;
//# sourceMappingURL=auditLog.routes.js.map