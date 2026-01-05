"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const config_1 = __importDefault(require("../config"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
class WalletFundingService {
    constructor() {
        this.paystackSecretKey = config_1.default.paystack.secretKey;
        this.paystackBaseUrl = 'https://api.paystack.co';
    }
    /**
     * Initialize wallet funding via Paystack
     */
    async initializeWalletFunding(userId, amount, metadata) {
        // Validate amount
        if (amount < 100) {
            throw new errors_1.BadRequestError('Minimum funding amount is ₦100');
        }
        if (amount > 1000000) {
            throw new errors_1.BadRequestError('Maximum funding amount is ₦1,000,000');
        }
        // Get user
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Generate payment reference
        const reference = `WALLET-FUND-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        try {
            // Initialize Paystack payment
            const paystackResponse = await axios_1.default.post(`${this.paystackBaseUrl}/transaction/initialize`, {
                email: user.email,
                amount: amount * 100, // Convert to kobo
                reference,
                currency: 'NGN',
                callback_url: `sharpLook://wallet/funding/verify`,
                metadata: {
                    userId: user._id.toString(),
                    type: 'wallet_funding',
                    purpose: 'Wallet Top-up',
                    ...metadata,
                },
                channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
            }, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            const { authorization_url, access_code } = paystackResponse.data.data;
            // ✅ NEW (add paymentType):
            const payment = await Payment_1.default.create({
                user: userId,
                amount,
                currency: 'NGN',
                paymentMethod: 'card',
                status: 'pending',
                reference,
                paymentType: 'wallet_funding', // ✅ ADD THIS LINE
                metadata: {
                    ...metadata,
                    authorizationUrl: paystackResponse.data.authorization_url,
                    accessCode: paystackResponse.data.access_code,
                },
            });
            logger_1.default.info(`Wallet funding initialized: ${reference} for user ${userId} - Amount: ₦${amount}`);
            return {
                payment,
                authorizationUrl: authorization_url,
                accessCode: access_code,
                reference,
            };
        }
        catch (error) {
            logger_1.default.error('Wallet funding initialization failed:', error);
            if (error.response?.data) {
                throw new errors_1.BadRequestError(error.response.data.message || 'Failed to initialize wallet funding');
            }
            throw new errors_1.BadRequestError('Failed to initialize wallet funding. Please try again.');
        }
    }
    /**
     * Verify wallet funding payment
     */
    async verifyWalletFunding(reference) {
        try {
            // Verify with Paystack
            const paystackResponse = await axios_1.default.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                },
            });
            const { status, authorization, amount } = paystackResponse.data.data;
            // Find payment
            const payment = await Payment_1.default.findOne({ reference });
            if (!payment) {
                throw new errors_1.NotFoundError('Payment not found');
            }
            // Get user
            const user = await User_1.default.findById(payment.user);
            if (!user) {
                throw new errors_1.NotFoundError('User not found');
            }
            // Update payment and credit wallet based on status
            if (status === 'success') {
                // Prevent double crediting
                if (payment.status === types_1.PaymentStatus.COMPLETED) {
                    logger_1.default.warn(`Payment already completed: ${reference}`);
                    return { payment, user, success: true };
                }
                const fundAmount = amount / 100; // Convert from kobo to naira
                // Update payment
                payment.status = types_1.PaymentStatus.COMPLETED;
                payment.paidAt = new Date();
                payment.paystackReference = reference;
                payment.authorizationCode = authorization?.authorization_code;
                await payment.save();
                // Credit wallet
                const previousBalance = user.walletBalance || 0;
                user.walletBalance = previousBalance + fundAmount;
                await user.save();
                // Create transaction record
                await Transaction_1.default.create({
                    user: user._id,
                    type: types_1.TransactionType.WALLET_CREDIT,
                    amount: fundAmount,
                    balanceBefore: previousBalance,
                    balanceAfter: user.walletBalance,
                    status: types_1.PaymentStatus.COMPLETED,
                    reference: `TXN-FUND-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
                    description: `Wallet funded via ${payment.paymentMethod}`,
                    payment: payment._id,
                    metadata: {
                        paymentMethod: payment.paymentMethod,
                        paystackReference: reference,
                        fundingType: 'card_payment',
                    },
                });
                logger_1.default.info(`✅ Wallet funded successfully: ${reference} - User: ${user._id} - Amount: ₦${fundAmount} - New Balance: ₦${user.walletBalance}`);
                // Notify user about successful funding
                try {
                    await notificationHelper_1.default.notifyWalletFunded(payment, user._id.toString(), fundAmount);
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify user about wallet funding:', notifyError);
                }
                return { payment, user, success: true };
            }
            else {
                // Payment failed
                payment.status = types_1.PaymentStatus.FAILED;
                await payment.save();
                logger_1.default.warn(`Wallet funding failed: ${reference} - Status: ${status}`);
                // Notify user about failed funding
                try {
                    await notificationHelper_1.default.notifyPaymentFailed(payment, user._id.toString(), 'Wallet funding failed');
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify user about funding failure:', notifyError);
                }
                return { payment, user, success: false };
            }
        }
        catch (error) {
            logger_1.default.error('Wallet funding verification failed:', error);
            if (error.response?.data) {
                throw new errors_1.BadRequestError(error.response.data.message || 'Failed to verify wallet funding');
            }
            throw error;
        }
    }
    /**
     * Process wallet funding from webhook (called by Paystack)
     */
    async processWalletFundingWebhook(data) {
        const { reference, authorization } = data;
        // Find payment
        const payment = await Payment_1.default.findOne({ reference });
        if (!payment) {
            logger_1.default.error(`Payment not found for webhook reference: ${reference}`);
            return;
        }
        // Check if it's a wallet funding payment
        if (payment.metadata?.type !== 'wallet_funding') {
            logger_1.default.info(`Skipping non-wallet-funding payment: ${reference}`);
            return;
        }
        // Prevent double processing
        if (payment.status === types_1.PaymentStatus.COMPLETED) {
            logger_1.default.warn(`Payment already processed: ${reference}`);
            return;
        }
        // Get user
        const user = await User_1.default.findById(payment.user);
        if (!user) {
            logger_1.default.error(`User not found for payment: ${reference}`);
            return;
        }
        // Update payment
        payment.status = types_1.PaymentStatus.COMPLETED;
        payment.paidAt = new Date();
        payment.paystackReference = reference;
        payment.authorizationCode = authorization?.authorization_code;
        await payment.save();
        // Credit wallet
        const previousBalance = user.walletBalance || 0;
        user.walletBalance = previousBalance + payment.amount;
        await user.save();
        // Create transaction record
        await Transaction_1.default.create({
            user: user._id,
            type: types_1.TransactionType.WALLET_CREDIT,
            amount: payment.amount,
            balanceBefore: previousBalance,
            balanceAfter: user.walletBalance,
            status: types_1.PaymentStatus.COMPLETED,
            reference: `TXN-FUND-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
            description: `Wallet funded via ${payment.paymentMethod}`,
            payment: payment._id,
            metadata: {
                paymentMethod: payment.paymentMethod,
                paystackReference: reference,
                fundingType: 'card_payment',
                processedVia: 'webhook',
            },
        });
        logger_1.default.info(`✅ Wallet funded via webhook: ${reference} - User: ${user._id} - Amount: ₦${payment.amount}`);
        // Notify user
        try {
            await notificationHelper_1.default.notifyWalletFunded(payment, user._id.toString(), payment.amount);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify user about wallet funding:', notifyError);
        }
    }
    /**
     * Direct wallet credit (Admin only)
     * Used for manual credits, bonuses, refunds, etc.
     */
    async creditWallet(userId, amount, description, adminId, metadata) {
        // Validate amount
        if (amount <= 0) {
            throw new errors_1.BadRequestError('Credit amount must be greater than zero');
        }
        // Get user
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Credit wallet
        const previousBalance = user.walletBalance || 0;
        user.walletBalance = previousBalance + amount;
        await user.save();
        // Create transaction record
        const transaction = await Transaction_1.default.create({
            user: userId,
            type: types_1.TransactionType.WALLET_CREDIT,
            amount,
            balanceBefore: previousBalance,
            balanceAfter: user.walletBalance,
            status: types_1.PaymentStatus.COMPLETED,
            reference: `TXN-CREDIT-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
            description: description || `Wallet credited by admin`,
            metadata: {
                creditedBy: adminId,
                creditType: 'manual_credit',
                ...metadata,
            },
        });
        logger_1.default.info(`✅ Wallet credited manually: User ${userId} - Amount: ₦${amount} - By Admin: ${adminId}`);
        return {
            user,
            transaction,
            previousBalance,
            newBalance: user.walletBalance,
        };
    }
    /**
     * Direct wallet debit (Admin only)
     * Used for manual debits, corrections, chargebacks, etc.
     */
    async debitWallet(userId, amount, description, adminId, metadata) {
        // Validate amount
        if (amount <= 0) {
            throw new errors_1.BadRequestError('Debit amount must be greater than zero');
        }
        // Get user
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Check balance
        const currentBalance = user.walletBalance || 0;
        if (currentBalance < amount) {
            throw new errors_1.BadRequestError(`Insufficient balance. Current: ₦${currentBalance}, Required: ₦${amount}`);
        }
        // Debit wallet
        const previousBalance = user.walletBalance;
        user.walletBalance = previousBalance - amount;
        await user.save();
        // Create transaction record
        const transaction = await Transaction_1.default.create({
            user: userId,
            type: types_1.TransactionType.WALLET_DEBIT,
            amount,
            balanceBefore: previousBalance,
            balanceAfter: user.walletBalance,
            status: types_1.PaymentStatus.COMPLETED,
            reference: `TXN-DEBIT-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`,
            description: description || `Wallet debited by admin`,
            metadata: {
                debitedBy: adminId,
                debitType: 'manual_debit',
                ...metadata,
            },
        });
        logger_1.default.info(`✅ Wallet debited manually: User ${userId} - Amount: ₦${amount} - By Admin: ${adminId}`);
        return {
            user,
            transaction,
            previousBalance,
            newBalance: user.walletBalance,
        };
    }
    /**
     * Get wallet funding history
     */
    async getFundingHistory(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const query = {
            user: userId,
            type: types_1.TransactionType.WALLET_CREDIT,
            status: types_1.PaymentStatus.COMPLETED,
        };
        const [transactions, total] = await Promise.all([
            Transaction_1.default.find(query)
                .populate('payment', 'reference paymentMethod amount')
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
}
exports.default = new WalletFundingService();
//# sourceMappingURL=walletFunding.service.js.map