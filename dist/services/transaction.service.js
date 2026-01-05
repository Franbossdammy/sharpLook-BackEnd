"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const errors_1 = require("../utils/errors");
const helpers_2 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class TransactionService {
    /**
     * Create a transaction record
     */
    async createTransaction(data) {
        // Get user to check balance
        const user = await User_1.default.findById(data.userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        const balanceBefore = user.walletBalance || 0;
        // Calculate balance after based on transaction type
        let balanceAfter = balanceBefore;
        if ([
            types_1.TransactionType.BOOKING_PAYMENT,
            types_1.TransactionType.ORDER_PAYMENT,
            types_1.TransactionType.BOOKING_EARNING,
            types_1.TransactionType.ORDER_EARNING,
            types_1.TransactionType.PAYMENT_RECEIVED,
            types_1.TransactionType.REFUND,
            types_1.TransactionType.WALLET_CREDIT
        ].includes(data.type)) {
            balanceAfter = balanceBefore + data.amount;
        }
        else if ([
            types_1.TransactionType.WITHDRAWAL,
            types_1.TransactionType.COMMISSION_DEDUCTION,
            types_1.TransactionType.WALLET_DEBIT
        ].includes(data.type)) {
            balanceAfter = balanceBefore - data.amount;
        }
        // Generate reference
        const reference = `TXN-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Create transaction
        const transaction = await Transaction_1.default.create({
            user: data.userId,
            type: data.type,
            amount: data.amount,
            balanceBefore,
            balanceAfter,
            status: types_1.PaymentStatus.COMPLETED,
            reference,
            description: data.description,
            booking: data.booking,
            order: data.order,
            payment: data.payment,
            withdrawal: data.withdrawal,
            metadata: data.metadata,
        });
        logger_1.default.info(`Transaction created: ${reference} for user ${data.userId}`);
        return transaction;
    }
    /**
     * Get user transactions
     */
    async getUserTransactions(userId, filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_2.parsePaginationParams)(page, limit);
        const query = { user: userId };
        if (filters?.type) {
            query.type = filters.type;
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }
        const [transactions, total] = await Promise.all([
            Transaction_1.default.find(query)
                .populate('booking', 'bookingNumber status')
                .populate('order', 'orderNumber status')
                .populate('payment', 'reference amount')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Transaction_1.default.countDocuments(query),
        ]);
        return {
            transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get transaction statistics
     */
    async getTransactionStats(userId, startDate, endDate) {
        const query = { user: userId };
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = startDate;
            if (endDate)
                query.createdAt.$lte = endDate;
        }
        const [totalIncome, totalExpense, totalBookingEarnings, totalOrderEarnings, totalWithdrawals, totalRefunds, transactionCount,] = await Promise.all([
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: {
                            $in: [
                                types_1.TransactionType.BOOKING_EARNING,
                                types_1.TransactionType.ORDER_EARNING,
                                types_1.TransactionType.PAYMENT_RECEIVED,
                                types_1.TransactionType.WALLET_CREDIT,
                            ],
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: {
                            $in: [
                                types_1.TransactionType.WITHDRAWAL,
                                types_1.TransactionType.COMMISSION_DEDUCTION,
                                types_1.TransactionType.WALLET_DEBIT,
                            ],
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.BOOKING_EARNING,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.ORDER_EARNING,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.WITHDRAWAL,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.REFUND,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.countDocuments(query),
        ]);
        return {
            totalIncome: totalIncome[0]?.total || 0,
            totalExpense: totalExpense[0]?.total || 0,
            totalBookingEarnings: totalBookingEarnings[0]?.total || 0,
            totalOrderEarnings: totalOrderEarnings[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0,
            totalRefunds: totalRefunds[0]?.total || 0,
            transactionCount,
            netIncome: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
        };
    }
    /**
     * Get transaction by ID
     */
    async getTransactionById(transactionId, userId) {
        const transaction = await Transaction_1.default.findOne({
            _id: transactionId,
            user: userId,
        })
            .populate('booking', 'bookingNumber status')
            .populate('order', 'orderNumber status')
            .populate('payment', 'reference amount');
        if (!transaction) {
            throw new errors_1.NotFoundError('Transaction not found');
        }
        return transaction;
    }
    /**
   * Get all transactions (admin)
   */
    async getAllTransactions(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_2.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.userId) {
            query.user = filters.userId;
        }
        if (filters?.type) {
            query.type = filters.type;
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }
        const [transactions, total] = await Promise.all([
            Transaction_1.default.find(query)
                .populate('user', 'firstName lastName email phone')
                .populate('booking', 'bookingNumber status')
                .populate('order', 'orderNumber status')
                .populate('payment', 'reference amount')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Transaction_1.default.countDocuments(query),
        ]);
        return {
            transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get platform transaction statistics (admin)
     */
    async getPlatformStats(startDate, endDate) {
        const query = {};
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = startDate;
            if (endDate)
                query.createdAt.$lte = endDate;
        }
        const [totalTransactions, totalVolume, totalIncome, totalExpense, totalCommissions, totalWithdrawals, totalRefunds, bookingEarnings, orderEarnings, transactionsByType,] = await Promise.all([
            Transaction_1.default.countDocuments(query),
            Transaction_1.default.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: {
                            $in: [
                                types_1.TransactionType.BOOKING_EARNING,
                                types_1.TransactionType.ORDER_EARNING,
                                types_1.TransactionType.PAYMENT_RECEIVED,
                                types_1.TransactionType.WALLET_CREDIT,
                            ],
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: {
                            $in: [
                                types_1.TransactionType.WITHDRAWAL,
                                types_1.TransactionType.COMMISSION_DEDUCTION,
                                types_1.TransactionType.WALLET_DEBIT,
                            ],
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.COMMISSION_DEDUCTION,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.WITHDRAWAL,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.REFUND,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.BOOKING_EARNING,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                {
                    $match: {
                        ...query,
                        type: types_1.TransactionType.ORDER_EARNING,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction_1.default.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        total: { $sum: '$amount' },
                    },
                },
            ]),
        ]);
        const byType = transactionsByType.reduce((acc, item) => {
            acc[item._id] = {
                count: item.count,
                total: item.total,
            };
            return acc;
        }, {});
        return {
            totalTransactions,
            totalVolume: totalVolume[0]?.total || 0,
            totalIncome: totalIncome[0]?.total || 0,
            totalExpense: totalExpense[0]?.total || 0,
            totalCommissions: totalCommissions[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0,
            totalRefunds: totalRefunds[0]?.total || 0,
            bookingEarnings: bookingEarnings[0]?.total || 0,
            orderEarnings: orderEarnings[0]?.total || 0,
            netRevenue: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
            byType,
        };
    }
    /**
     * Get transaction by ID (admin)
     */
    async getTransactionByIdAdmin(transactionId) {
        const transaction = await Transaction_1.default.findById(transactionId)
            .populate('user', 'firstName lastName email phone')
            .populate('booking', 'bookingNumber status totalAmount')
            .populate('order', 'orderNumber status totalAmount')
            .populate('payment', 'reference amount status');
        if (!transaction) {
            throw new errors_1.NotFoundError('Transaction not found');
        }
        return transaction;
    }
}
exports.default = new TransactionService();
//# sourceMappingURL=transaction.service.js.map