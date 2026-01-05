"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Withdrawal_1 = __importDefault(require("../models/Withdrawal"));
const config_1 = __importDefault(require("../config"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
class SharpPayService {
    constructor() {
        this.paystackSecretKey = config_1.default.paystack.secretKey;
        this.paystackBaseUrl = 'https://api.paystack.co';
    }
    // ==================== WALLET BALANCE ====================
    /**
     * Get wallet balance
     */
    async getBalance(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        return {
            balance: user.walletBalance || 0,
            currency: 'NGN',
        };
    }
    // ==================== DEPOSIT/FUND WALLET ====================
    /**
     * Initialize wallet deposit/funding
     */
    async initializeDeposit(userId, amount, metadata) {
        // Validate amount
        if (amount < 100) {
            throw new errors_1.BadRequestError('Minimum deposit is ₦100');
        }
        // Get user
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Generate reference
        const reference = `WALLET-DEP-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Initialize Paystack payment
        const paystackResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transaction/initialize`, {
            email: user.email,
            amount: amount * 100, // Convert to kobo
            reference,
            currency: 'NGN',
            callback_url: `sharpLook://wallet/deposit/verify`,
            metadata: {
                userId: user._id.toString(),
                type: 'wallet_deposit',
                ...metadata,
            },
        }, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
        });
        const { authorization_url, access_code } = paystackResponse.data.data;
        // Create pending transaction
        await Transaction_1.default.create({
            user: userId,
            type: types_1.TransactionType.DEPOSIT,
            amount: amount,
            balanceBefore: user.walletBalance || 0,
            balanceAfter: (user.walletBalance || 0) + amount,
            status: types_1.PaymentStatus.PENDING,
            reference,
            description: `Wallet deposit of ₦${amount.toLocaleString()}`,
            metadata: {
                paystackReference: reference,
                depositType: 'card',
            },
        });
        logger_1.default.info(`Wallet deposit initialized: ${reference} for user ${userId}`);
        return {
            authorizationUrl: authorization_url,
            reference,
            accessCode: access_code,
        };
    }
    /**
     * Verify wallet deposit
     */
    async verifyDeposit(reference) {
        // Verify with Paystack
        const paystackResponse = await axios_1.default.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
            },
        });
        const { status } = paystackResponse.data.data;
        // Find transaction
        const transaction = await Transaction_1.default.findOne({ reference });
        if (!transaction) {
            throw new errors_1.NotFoundError('Transaction not found');
        }
        if (status === 'success') {
            // Update transaction
            transaction.status = types_1.PaymentStatus.COMPLETED;
            await transaction.save();
            // Credit user wallet
            const user = await User_1.default.findById(transaction.user);
            if (user) {
                const previousBalance = user.walletBalance || 0;
                user.walletBalance = previousBalance + transaction.amount;
                await user.save();
                // Update transaction balance
                transaction.balanceAfter = user.walletBalance;
                await transaction.save();
                // ✅ Notify user about successful deposit
                try {
                    await notificationHelper_1.default.notifyWalletCredited(transaction, user._id.toString());
                }
                catch (error) {
                    logger_1.default.error('Failed to notify about deposit:', error);
                }
                logger_1.default.info(`Wallet funded: ${reference} - ₦${transaction.amount}`);
                return {
                    success: true,
                    transaction,
                    newBalance: user.walletBalance,
                };
            }
        }
        // Failed deposit
        transaction.status = types_1.PaymentStatus.FAILED;
        await transaction.save();
        throw new errors_1.BadRequestError('Deposit verification failed');
    }
    // ==================== TRANSACTIONS ====================
    /**
     * Get wallet transactions
     */
    async getTransactions(userId, filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
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
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .populate('booking', 'service scheduledDate status')
                .populate('order', 'orderNumber status')
                .populate('withdrawal', 'status bankName accountNumber'),
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
     * Get wallet statistics
     */
    async getWalletStats(userId) {
        const balance = await this.getBalance(userId);
        const [totalDeposits, totalEarnings, totalWithdrawals, totalSpent, pendingWithdrawals,] = await Promise.all([
            // Total deposits
            Transaction_1.default.aggregate([
                {
                    $match: {
                        user: userId,
                        type: types_1.TransactionType.DEPOSIT,
                        status: types_1.PaymentStatus.COMPLETED,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            // Total earnings
            Transaction_1.default.aggregate([
                {
                    $match: {
                        user: userId,
                        type: {
                            $in: [
                                types_1.TransactionType.BOOKING_EARNING,
                                types_1.TransactionType.ORDER_EARNING,
                                types_1.TransactionType.PAYMENT_RECEIVED,
                            ],
                        },
                        status: types_1.PaymentStatus.COMPLETED,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            // Total withdrawals
            Transaction_1.default.aggregate([
                {
                    $match: {
                        user: userId,
                        type: types_1.TransactionType.WITHDRAWAL,
                        status: types_1.PaymentStatus.COMPLETED,
                    },
                },
                { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
            ]),
            // Total spent
            Transaction_1.default.aggregate([
                {
                    $match: {
                        user: userId,
                        type: {
                            $in: [types_1.TransactionType.BOOKING_PAYMENT, types_1.TransactionType.ORDER_PAYMENT],
                        },
                        status: types_1.PaymentStatus.COMPLETED,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            // Pending withdrawals
            Withdrawal_1.default.aggregate([
                { $match: { user: userId, status: 'pending' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);
        return {
            currentBalance: balance.balance,
            totalDeposits: totalDeposits[0]?.total || 0,
            totalEarnings: totalEarnings[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0,
            totalSpent: totalSpent[0]?.total || 0,
            pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
            availableBalance: balance.balance - (pendingWithdrawals[0]?.total || 0),
        };
    }
    // ==================== WITHDRAWALS ====================
    /**
     * Request withdrawal
     */
    async requestWithdrawal(userId, data) {
        // Get user
        const user = await User_1.default.findById(userId).select('+withdrawalPin');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Check if vendor
        if (!user.isVendor) {
            throw new errors_1.BadRequestError('Only vendors can withdraw funds');
        }
        // Verify withdrawal PIN
        const bcrypt = require('bcryptjs');
        if (!user.withdrawalPin) {
            throw new errors_1.BadRequestError('Please set up your withdrawal PIN first');
        }
        const isPinValid = await bcrypt.compare(data.pin, user.withdrawalPin);
        if (!isPinValid) {
            throw new errors_1.BadRequestError('Invalid withdrawal PIN');
        }
        // Check balance
        const balance = user.walletBalance || 0;
        if (balance < data.amount) {
            throw new errors_1.BadRequestError('Insufficient wallet balance');
        }
        // Check minimum withdrawal
        if (data.amount < 1000) {
            throw new errors_1.BadRequestError('Minimum withdrawal is ₦1,000');
        }
        // Generate reference
        const reference = `WTH-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Calculate withdrawal fee
        const withdrawalFee = 100;
        const netAmount = data.amount - withdrawalFee;
        // Create withdrawal request
        const withdrawal = await Withdrawal_1.default.create({
            user: userId,
            amount: data.amount,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            reference,
            withdrawalFee,
            netAmount,
            status: 'pending',
            requestedAt: new Date(),
        });
        // Deduct from wallet balance (held until processed)
        const previousBalance = user.walletBalance || 0;
        user.walletBalance = balance - data.amount;
        await user.save();
        // Create transaction record
        await Transaction_1.default.create({
            user: userId,
            type: types_1.TransactionType.WITHDRAWAL,
            amount: data.amount,
            balanceBefore: previousBalance,
            balanceAfter: user.walletBalance,
            status: types_1.PaymentStatus.PENDING,
            reference: `TXN-WTH-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
            description: `Withdrawal to ${data.bankName} - ${data.accountNumber}`,
            withdrawal: withdrawal._id,
            metadata: {
                withdrawalFee,
                netAmount,
            },
        });
        logger_1.default.info(`Withdrawal requested: ${reference} by user ${userId}`);
        return withdrawal;
    }
    /**
     * Process withdrawal (Admin)
     */
    async processWithdrawal(withdrawalId, adminId) {
        const withdrawal = await Withdrawal_1.default.findById(withdrawalId);
        if (!withdrawal) {
            throw new errors_1.NotFoundError('Withdrawal not found');
        }
        if (withdrawal.status !== 'pending') {
            throw new errors_1.BadRequestError('Only pending withdrawals can be processed');
        }
        withdrawal.status = 'processing';
        withdrawal.processedBy = adminId;
        withdrawal.processedAt = new Date();
        await withdrawal.save();
        try {
            // Create transfer recipient
            const recipientResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transferrecipient`, {
                type: 'nuban',
                name: withdrawal.accountName,
                account_number: withdrawal.accountNumber,
                bank_code: this.getBankCode(withdrawal.bankName),
                currency: 'NGN',
            }, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            const recipientCode = recipientResponse.data.data.recipient_code;
            withdrawal.paystackRecipientCode = recipientCode;
            await withdrawal.save();
            // Initiate transfer
            const transferResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transfer`, {
                source: 'balance',
                amount: withdrawal.netAmount * 100,
                recipient: recipientCode,
                reference: withdrawal.reference,
                reason: `SharpPay withdrawal`,
            }, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            const transferCode = transferResponse.data.data.transfer_code;
            withdrawal.paystackTransferCode = transferCode;
            await withdrawal.save();
            logger_1.default.info(`Withdrawal transfer initiated: ${withdrawal.reference}`);
        }
        catch (error) {
            withdrawal.status = 'failed';
            withdrawal.failedAt = new Date();
            withdrawal.failureReason = error.message;
            await withdrawal.save();
            // Refund to wallet
            const user = await User_1.default.findById(withdrawal.user);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
                await user.save();
                // Update transaction
                await Transaction_1.default.updateOne({ withdrawal: withdrawal._id }, { status: types_1.PaymentStatus.FAILED });
            }
            logger_1.default.error(`Withdrawal failed: ${withdrawal.reference}`, error);
        }
        return withdrawal;
    }
    /**
     * Reject withdrawal (Admin)
     */
    async rejectWithdrawal(withdrawalId, adminId, reason) {
        const withdrawal = await Withdrawal_1.default.findById(withdrawalId);
        if (!withdrawal) {
            throw new errors_1.NotFoundError('Withdrawal not found');
        }
        if (withdrawal.status !== 'pending') {
            throw new errors_1.BadRequestError('Only pending withdrawals can be rejected');
        }
        withdrawal.status = 'rejected';
        withdrawal.rejectedAt = new Date();
        withdrawal.rejectionReason = reason;
        withdrawal.processedBy = adminId;
        await withdrawal.save();
        // Refund to wallet
        const user = await User_1.default.findById(withdrawal.user);
        if (user) {
            user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
            await user.save();
            // Update transaction
            await Transaction_1.default.updateOne({ withdrawal: withdrawal._id }, { status: types_1.PaymentStatus.REFUNDED });
        }
        logger_1.default.info(`Withdrawal rejected: ${withdrawal.reference}`);
        return withdrawal;
    }
    /**
     * Get withdrawal by ID
     */
    async getWithdrawalById(withdrawalId, userId) {
        const withdrawal = await Withdrawal_1.default.findById(withdrawalId).populate('user', 'firstName lastName email');
        if (!withdrawal) {
            throw new errors_1.NotFoundError('Withdrawal not found');
        }
        if (withdrawal.user._id.toString() !== userId) {
            throw new errors_1.BadRequestError('Not authorized to view this withdrawal');
        }
        return withdrawal;
    }
    /**
     * Get user withdrawals
     */
    async getUserWithdrawals(userId, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [withdrawals, total] = await Promise.all([
            Withdrawal_1.default.find({ user: userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Withdrawal_1.default.countDocuments({ user: userId }),
        ]);
        return {
            withdrawals,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get all withdrawals (Admin)
     */
    async getAllWithdrawals(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
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
        const [withdrawals, total] = await Promise.all([
            Withdrawal_1.default.find(query)
                .populate('user', 'firstName lastName email vendorProfile')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Withdrawal_1.default.countDocuments(query),
        ]);
        return {
            withdrawals,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    // ==================== HELPERS ====================
    /**
     * Helper: Get bank code from bank name
     */
    getBankCode(bankName) {
        const bankCodes = {
            'Access Bank': '044',
            'GTBank': '058',
            'First Bank': '011',
            'UBA': '033',
            'Zenith Bank': '057',
            'Fidelity Bank': '070',
            'FCMB': '214',
            'Sterling Bank': '232',
            'Union Bank': '032',
            'Wema Bank': '035',
            'Polaris Bank': '076',
            'Stanbic IBTC': '221',
            'Standard Chartered': '068',
            'Keystone Bank': '082',
            'Unity Bank': '215',
            'Jaiz Bank': '301',
            'Heritage Bank': '030',
            'Ecobank': '050',
            'Kuda Bank': '50211',
            'Opay': '999992',
            'Palmpay': '999991',
            'Moniepoint': '50515',
        };
        return bankCodes[bankName] || '044';
    }
}
exports.default = new SharpPayService();
//# sourceMappingURL=sharpPay.service.js.map