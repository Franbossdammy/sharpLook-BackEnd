"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sharpPay_service_1 = __importDefault(require("../services/sharpPay.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class SharpPayController {
    constructor() {
        // ==================== BALANCE ====================
        /**
         * Get wallet balance
         */
        this.getBalance = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const balance = await sharpPay_service_1.default.getBalance(userId);
            return response_1.default.success(res, 'Wallet balance retrieved successfully', balance);
        });
        // ==================== DEPOSITS ====================
        /**
         * Initialize wallet deposit
         */
        this.initializeDeposit = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { amount, metadata } = req.body;
            const result = await sharpPay_service_1.default.initializeDeposit(userId, amount, metadata);
            return response_1.default.created(res, 'Wallet deposit initialized successfully', result);
        });
        /**
         * Verify wallet deposit
         */
        this.verifyDeposit = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reference } = req.params;
            const result = await sharpPay_service_1.default.verifyDeposit(reference);
            return response_1.default.success(res, 'Wallet deposit verified successfully', result);
        });
        // ==================== TRANSACTIONS ====================
        /**
         * Get wallet transactions
         */
        this.getTransactions = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                type: req.query.type,
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await sharpPay_service_1.default.getTransactions(userId, filters, page, limit);
            return response_1.default.paginated(res, 'Transactions retrieved successfully', result.transactions, page, limit, result.total);
        });
        /**
         * Get wallet statistics
         */
        this.getWalletStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const stats = await sharpPay_service_1.default.getWalletStats(userId);
            return response_1.default.success(res, 'Wallet statistics retrieved successfully', { stats });
        });
        // ==================== WITHDRAWALS ====================
        /**
         * Request withdrawal
         */
        this.requestWithdrawal = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const withdrawal = await sharpPay_service_1.default.requestWithdrawal(userId, req.body);
            return response_1.default.created(res, 'Withdrawal request submitted successfully', {
                withdrawal,
            });
        });
        /**
         * Get withdrawal by ID
         */
        this.getWithdrawalById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { withdrawalId } = req.params;
            const userId = req.user.id;
            const withdrawal = await sharpPay_service_1.default.getWithdrawalById(withdrawalId, userId);
            return response_1.default.success(res, 'Withdrawal retrieved successfully', { withdrawal });
        });
        /**
         * Get user withdrawals
         */
        this.getUserWithdrawals = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sharpPay_service_1.default.getUserWithdrawals(userId, page, limit);
            return response_1.default.paginated(res, 'Withdrawals retrieved successfully', result.withdrawals, page, limit, result.total);
        });
        // ==================== ADMIN ENDPOINTS ====================
        /**
         * Get all withdrawals (Admin)
         */
        this.getAllWithdrawals = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await sharpPay_service_1.default.getAllWithdrawals(filters, page, limit);
            return response_1.default.paginated(res, 'Withdrawals retrieved successfully', result.withdrawals, page, limit, result.total);
        });
        /**
         * Process withdrawal (Admin)
         */
        this.processWithdrawal = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { withdrawalId } = req.params;
            const adminId = req.user.id;
            const withdrawal = await sharpPay_service_1.default.processWithdrawal(withdrawalId, adminId);
            return response_1.default.success(res, 'Withdrawal processing initiated', { withdrawal });
        });
        /**
         * Reject withdrawal (Admin)
         */
        this.rejectWithdrawal = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { withdrawalId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const withdrawal = await sharpPay_service_1.default.rejectWithdrawal(withdrawalId, adminId, reason);
            return response_1.default.success(res, 'Withdrawal rejected', { withdrawal });
        });
    }
}
exports.default = new SharpPayController();
//# sourceMappingURL=sharpPay.controller.js.map