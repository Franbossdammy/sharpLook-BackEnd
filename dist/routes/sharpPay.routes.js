"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sharpPay_controller_1 = __importDefault(require("../controllers/sharpPay.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const sharpPay_validation_1 = require("../validations/sharpPay.validation");
const router = (0, express_1.Router)();
// ==================== WALLET BALANCE ====================
/**
 * @route   GET /api/v1/sharppay/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/balance', auth_1.authenticate, sharpPay_controller_1.default.getBalance);
// ==================== DEPOSITS ====================
/**
 * @route   POST /api/v1/sharppay/deposit/initialize
 * @desc    Initialize wallet deposit
 * @access  Private
 */
router.post('/deposit/initialize', auth_1.authenticate, (0, validate_1.validate)(sharpPay_validation_1.initializeDepositValidation), sharpPay_controller_1.default.initializeDeposit);
/**
 * @route   GET /api/v1/sharppay/deposit/verify/:reference
 * @desc    Verify wallet deposit
 * @access  Private
 */
router.get('/deposit/verify/:reference', auth_1.authenticate, (0, validate_1.validate)(sharpPay_validation_1.verifyDepositValidation), sharpPay_controller_1.default.verifyDeposit);
// ==================== TRANSACTIONS ====================
/**
 * @route   GET /api/v1/sharppay/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get('/transactions', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(sharpPay_validation_1.getTransactionsValidation), sharpPay_controller_1.default.getTransactions);
/**
 * @route   GET /api/v1/sharppay/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/stats', auth_1.authenticate, sharpPay_controller_1.default.getWalletStats);
// ==================== WITHDRAWALS ====================
/**
 * @route   POST /api/v1/sharppay/withdraw
 * @desc    Request withdrawal
 * @access  Private (Vendor)
 */
router.post('/withdraw', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)(sharpPay_validation_1.requestWithdrawalValidation), sharpPay_controller_1.default.requestWithdrawal);
/**
 * @route   GET /api/v1/sharppay/withdrawals/my-withdrawals
 * @desc    Get user withdrawals
 * @access  Private (Vendor)
 */
router.get('/withdrawals/my-withdrawals', auth_1.authenticate, auth_1.requireVendor, validate_1.validatePagination, sharpPay_controller_1.default.getUserWithdrawals);
/**
 * @route   GET /api/v1/sharppay/withdrawals/:withdrawalId
 * @desc    Get withdrawal by ID
 * @access  Private
 */
router.get('/withdrawals/:withdrawalId', auth_1.authenticate, (0, validate_1.validate)(sharpPay_validation_1.withdrawalIdValidation), sharpPay_controller_1.default.getWithdrawalById);
// ==================== ADMIN WITHDRAWAL ROUTES ====================
/**
 * @route   GET /api/v1/sharppay/withdrawals
 * @desc    Get all withdrawals (Admin)
 * @access  Private (Financial Admin)
 */
router.get('/withdrawals', auth_1.authenticate, auth_1.requireFinancialAdmin, validate_1.validatePagination, (0, validate_1.validate)(sharpPay_validation_1.getWithdrawalsValidation), sharpPay_controller_1.default.getAllWithdrawals);
/**
 * @route   POST /api/v1/sharppay/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post('/withdrawals/:withdrawalId/process', auth_1.authenticate, auth_1.requireFinancialAdmin, (0, validate_1.validate)(sharpPay_validation_1.withdrawalIdValidation), sharpPay_controller_1.default.processWithdrawal);
/**
 * @route   POST /api/v1/sharppay/withdrawals/:withdrawalId/reject
 * @desc    Reject withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post('/withdrawals/:withdrawalId/reject', auth_1.authenticate, auth_1.requireFinancialAdmin, (0, validate_1.validate)([...sharpPay_validation_1.withdrawalIdValidation, ...sharpPay_validation_1.rejectWithdrawalValidation]), sharpPay_controller_1.default.rejectWithdrawal);
exports.default = router;
//# sourceMappingURL=sharpPay.routes.js.map