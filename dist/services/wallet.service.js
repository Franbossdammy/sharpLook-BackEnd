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
class WalletService {
    constructor() {
        this.paystackSecretKey = config_1.default.paystack.secretKey;
        this.paystackBaseUrl = 'https://api.paystack.co';
    }
    /**
     * Get wallet balance
     */
    async getBalance(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        return user.walletBalance || 0;
    }
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
                .populate('booking', 'service scheduledDate'),
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
     * Request withdrawal
   // FIX: Update requestWithdrawal in wallet.service.ts
  // The issue is that withdrawalPin is not being selected from the database
  
  /**
   * Request withdrawal
   */
    async requestWithdrawal(userId, data) {
        // ✅ FIX: Add .select('+withdrawalPin') to include the PIN field
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
        // ✅ Now this check will work correctly
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
            bankCode: data.bankCode, // ✅ Store it directly
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            reference,
            withdrawalFee,
            netAmount,
            status: 'pending',
            requestedAt: new Date(),
        });
        // Deduct from wallet balance (held until processed)
        user.walletBalance = balance - data.amount;
        await user.save();
        // Create transaction record
        await Transaction_1.default.create({
            user: userId,
            type: types_1.TransactionType.WITHDRAWAL,
            amount: -data.amount,
            balanceBefore: balance,
            balanceAfter: user.walletBalance,
            status: types_1.PaymentStatus.PENDING,
            reference: `TXN-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
            description: `Withdrawal to ${data.bankName} - ${data.accountNumber}`,
            withdrawal: withdrawal._id,
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
            const bankCode = withdrawal.bankCode || this.getBankCode(withdrawal.bankName);
            // ✅ STEP 1: Verify the account details first
            logger_1.default.info(`Verifying account details for withdrawal: ${withdrawal.reference}`);
            const verifyResponse = await axios_1.default.get(`${this.paystackBaseUrl}/bank/resolve`, {
                params: {
                    account_number: withdrawal.accountNumber,
                    bank_code: bankCode,
                },
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                },
            });
            const verifiedAccountName = verifyResponse.data.data.account_name;
            // Optional: Check if names match
            logger_1.default.info(`Account verified: ${verifiedAccountName}`);
            // ✅ STEP 2: Create transfer recipient with verified details
            logger_1.default.info(`Creating transfer recipient for withdrawal: ${withdrawal.reference}`);
            const recipientResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transferrecipient`, {
                type: 'nuban',
                name: verifiedAccountName, // Use the verified name from Paystack
                account_number: withdrawal.accountNumber,
                bank_code: bankCode,
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
            // ✅ STEP 3: Initiate transfer
            logger_1.default.info(`Initiating transfer for withdrawal: ${withdrawal.reference}`);
            const transferResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transfer`, {
                source: 'balance',
                amount: withdrawal.netAmount * 100,
                recipient: recipientCode,
                reference: withdrawal.reference,
                reason: `Withdrawal for vendor`,
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
            if (axios_1.default.isAxiosError(error)) {
                logger_1.default.error(`Paystack API Error for withdrawal ${withdrawal.reference}:`, {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message,
                });
                const errorMessage = error.response?.data?.message || error.message;
                withdrawal.failureReason = errorMessage;
            }
            else {
                logger_1.default.error(`Withdrawal processing error for ${withdrawal.reference}:`, error);
                withdrawal.failureReason = error.message;
            }
            withdrawal.status = 'failed';
            withdrawal.failedAt = new Date();
            await withdrawal.save();
            // Refund to wallet
            const user = await User_1.default.findById(withdrawal.user);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
                await user.save();
                logger_1.default.info(`Refunded ${withdrawal.amount} to user ${user._id} wallet`);
            }
            throw error;
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
        // Check status
        if (withdrawal.status !== 'pending') {
            throw new errors_1.BadRequestError('Only pending withdrawals can be rejected');
        }
        // Update status
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
        // Verify ownership (unless admin)
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
    /**
     * Get wallet statistics
     */
    async getWalletStats(userId) {
        const balance = await this.getBalance(userId);
        const [totalReceived, totalWithdrawn, pendingWithdrawals] = await Promise.all([
            Transaction_1.default.aggregate([
                {
                    $match: {
                        user: userId,
                        type: { $in: [types_1.TransactionType.BOOKING_PAYMENT, types_1.TransactionType.DEPOSIT] },
                        status: types_1.PaymentStatus.COMPLETED,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
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
            Withdrawal_1.default.aggregate([
                { $match: { user: userId, status: 'pending' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);
        return {
            balance,
            totalReceived: totalReceived[0]?.total || 0,
            totalWithdrawn: totalWithdrawn[0]?.total || 0,
            pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
        };
    }
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
        };
        return bankCodes[bankName] || '044'; // Default to Access Bank
    }
}
exports.default = new WalletService();
//# sourceMappingURL=wallet.service.js.map