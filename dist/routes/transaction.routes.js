"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaction_controller_1 = __importDefault(require("../controllers/transaction.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/transactions
 * @desc    Get user transactions
 * @access  Private
 */
router.get('/', auth_1.authenticate, validate_1.validatePagination, transaction_controller_1.default.getMyTransactions);
/**
 * @route   GET /api/v1/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private
 */
router.get('/stats', auth_1.authenticate, transaction_controller_1.default.getTransactionStats);
/**
 * @route   GET /api/v1/transactions/:transactionId
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/:transactionId', auth_1.authenticate, transaction_controller_1.default.getTransactionById);
const auth_2 = require("../middlewares/auth");
// ==================== ADMIN ROUTES ====================
/**
 * @route   GET /api/v1/transactions/admin/stats
 * @desc    Get platform transaction statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', auth_1.authenticate, auth_2.requireAdmin, transaction_controller_1.default.getPlatformStats);
/**
 * @route   GET /api/v1/transactions/admin/all
 * @desc    Get all transactions
 * @access  Private (Admin)
 */
router.get('/admin/all', auth_1.authenticate, auth_2.requireAdmin, validate_1.validatePagination, transaction_controller_1.default.getAllTransactions);
/**
 * @route   GET /api/v1/transactions/admin/:transactionId
 * @desc    Get transaction by ID (admin)
 * @access  Private (Admin)
 */
router.get('/admin/:transactionId', auth_1.authenticate, auth_2.requireAdmin, transaction_controller_1.default.getTransactionByIdAdmin);
exports.default = router;
//# sourceMappingURL=transaction.routes.js.map