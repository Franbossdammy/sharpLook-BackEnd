"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const walletFunding_service_1 = __importDefault(require("../services/walletFunding.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const paystackHelper_1 = __importDefault(require("../utils/paystackHelper"));
class WalletFundingController {
    constructor() {
        // ADD THESE METHODS TO YOUR EXISTING payment.controller.ts (walletController)
        /**
         * Verify bank account
         * POST /api/v1/payments/wallet/verify-account
         */
        this.verifyBankAccount = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { accountNumber, bankCode } = req.body;
            if (!accountNumber || !bankCode) {
                throw new errors_1.BadRequestError('Account number and bank code are required');
            }
            // Validate account number
            if (accountNumber.length !== 10) {
                throw new errors_1.BadRequestError('Account number must be 10 digits');
            }
            try {
                const result = await paystackHelper_1.default.verifyBankAccount(accountNumber, bankCode);
                logger_1.default.info(`✅ Account verified: ${result.account_name} (${accountNumber})`);
                return response_1.default.success(res, 'Account verified successfully', {
                    accountNumber,
                    accountName: result.account_name,
                    bankCode,
                });
            }
            catch (error) {
                logger_1.default.error('❌ Bank account verification failed:', error);
                throw new errors_1.BadRequestError(error.message || 'Unable to verify account details. Please check your account number and bank.');
            }
        });
        /**
         * Get list of banks
         * GET /api/v1/payments/wallet/banks
         */
        this.getBankList = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            try {
                const banks = await paystackHelper_1.default.getBanks();
                // Filter for Nigerian banks and format response
                const nigerianBanks = banks
                    .filter((bank) => bank.country === 'Nigeria')
                    .map((bank) => ({
                    name: bank.name,
                    code: bank.code,
                    id: bank.id,
                }));
                return response_1.default.success(res, 'Banks retrieved successfully', { banks: nigerianBanks });
            }
            catch (error) {
                logger_1.default.error('❌ Failed to fetch banks:', error);
                throw new errors_1.BadRequestError('Failed to fetch bank list');
            }
        });
        /**
         * Initialize wallet funding
         * POST /api/v1/wallet/fund/initialize
         */
        this.initializeWalletFunding = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { amount, metadata } = req.body;
            const result = await walletFunding_service_1.default.initializeWalletFunding(userId, amount, metadata);
            return response_1.default.success(res, 'Wallet funding initialized successfully', {
                payment: {
                    id: result.payment._id,
                    amount: result.payment.amount,
                    reference: result.reference,
                    status: result.payment.status,
                },
                authorizationUrl: result.authorizationUrl,
                accessCode: result.accessCode,
                reference: result.reference,
            });
        });
        /**
         * Verify wallet funding payment
         * GET /api/v1/wallet/fund/verify/:reference
         */
        this.verifyWalletFunding = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reference } = req.params;
            const result = await walletFunding_service_1.default.verifyWalletFunding(reference);
            if (result.success) {
                return response_1.default.success(res, 'Wallet funded successfully', {
                    payment: {
                        id: result.payment._id,
                        amount: result.payment.amount,
                        reference: result.payment.reference,
                        status: result.payment.status,
                        paidAt: result.payment.paidAt,
                    },
                    wallet: {
                        balance: result.user.walletBalance,
                    },
                    message: `₦${result.payment.amount.toLocaleString()} has been added to your wallet`,
                });
            }
            else {
                return response_1.default.error(res, 'Wallet funding failed', 400, {
                    payment: {
                        id: result.payment._id,
                        reference: result.payment.reference,
                        status: result.payment.status,
                    },
                    message: 'Payment verification failed. Please try again.',
                });
            }
        });
        /**
         * Get wallet funding history
         * GET /api/v1/wallet/fund/history
         */
        this.getFundingHistory = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await walletFunding_service_1.default.getFundingHistory(userId, page, limit);
            return response_1.default.paginated(res, 'Funding history retrieved successfully', result.transactions, page, limit, result.total);
        });
        /**
         * Credit user wallet (Admin only)
         * POST /api/v1/wallet/fund/credit
         */
        this.creditWallet = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const adminId = req.user.id;
            const { userId, amount, description, metadata } = req.body;
            if (!userId || !amount) {
                throw new errors_1.BadRequestError('User ID and amount are required');
            }
            const result = await walletFunding_service_1.default.creditWallet(userId, amount, description || `Wallet credited by admin`, adminId, metadata);
            logger_1.default.info(`Admin ${adminId} credited ₦${amount} to user ${userId}`);
            return response_1.default.success(res, 'Wallet credited successfully', {
                user: {
                    id: result.user._id,
                    email: result.user.email,
                    previousBalance: result.previousBalance,
                    newBalance: result.newBalance,
                    creditedAmount: amount,
                },
                transaction: {
                    id: result.transaction._id,
                    reference: result.transaction.reference,
                    description: result.transaction.description,
                },
            });
        });
        /**
         * Debit user wallet (Admin only)
         * POST /api/v1/wallet/fund/debit
         */
        this.debitWallet = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const adminId = req.user.id;
            const { userId, amount, description, metadata } = req.body;
            if (!userId || !amount) {
                throw new errors_1.BadRequestError('User ID and amount are required');
            }
            const result = await walletFunding_service_1.default.debitWallet(userId, amount, description || `Wallet debited by admin`, adminId, metadata);
            logger_1.default.info(`Admin ${adminId} debited ₦${amount} from user ${userId}`);
            return response_1.default.success(res, 'Wallet debited successfully', {
                user: {
                    id: result.user._id,
                    email: result.user.email,
                    previousBalance: result.previousBalance,
                    newBalance: result.newBalance,
                    debitedAmount: amount,
                },
                transaction: {
                    id: result.transaction._id,
                    reference: result.transaction.reference,
                    description: result.transaction.description,
                },
            });
        });
    }
}
exports.default = new WalletFundingController();
//# sourceMappingURL=walletFunding.controller.js.map