"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_service_1 = __importDefault(require("../services/transaction.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class TransactionController {
    constructor() {
        this.getMyTransactions = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                type: req.query.type,
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await transaction_service_1.default.getUserTransactions(userId, filters, page, limit);
            return response_1.default.paginated(res, 'Transactions retrieved successfully', result.transactions, page, limit, result.total);
        });
        this.getTransactionStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const startDate = req.query.startDate
                ? new Date(req.query.startDate)
                : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            const stats = await transaction_service_1.default.getTransactionStats(userId, startDate, endDate);
            return response_1.default.success(res, 'Transaction statistics retrieved', { stats });
        });
        this.getTransactionById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { transactionId } = req.params;
            const userId = req.user.id;
            const transaction = await transaction_service_1.default.getTransactionById(transactionId, userId);
            return response_1.default.success(res, 'Transaction retrieved successfully', {
                transaction,
            });
        });
        /**
       * Get all transactions (admin)
       * GET /api/v1/transactions/admin/all
       */
        this.getAllTransactions = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                userId: req.query.userId,
                type: req.query.type,
                status: req.query.status,
            };
            if (req.query.startDate) {
                filters.startDate = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filters.endDate = new Date(req.query.endDate);
            }
            // Remove undefined filters
            Object.keys(filters).forEach((key) => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            const result = await transaction_service_1.default.getAllTransactions(filters, page, limit);
            return response_1.default.paginated(res, 'Transactions retrieved successfully', result.transactions, page, limit, result.total);
        });
        /**
         * Get platform transaction statistics (admin)
         * GET /api/v1/transactions/admin/stats
         */
        this.getPlatformStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const startDate = req.query.startDate
                ? new Date(req.query.startDate)
                : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            const stats = await transaction_service_1.default.getPlatformStats(startDate, endDate);
            return response_1.default.success(res, 'Platform statistics retrieved', { stats });
        });
        /**
         * Get transaction by ID (admin)
         * GET /api/v1/transactions/admin/:transactionId
         */
        this.getTransactionByIdAdmin = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { transactionId } = req.params;
            const transaction = await transaction_service_1.default.getTransactionByIdAdmin(transactionId);
            return response_1.default.success(res, 'Transaction retrieved successfully', {
                transaction,
            });
        });
    }
}
exports.default = new TransactionController();
//# sourceMappingURL=transaction.controller.js.map