"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletController = exports.paymentController = void 0;
const payment_service_1 = __importDefault(require("../services/payment.service"));
const wallet_service_1 = __importDefault(require("../services/wallet.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class PaymentController {
    constructor() {
        // ==================== BOOKING PAYMENT ENDPOINTS ====================
        this.initializePayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { bookingId, metadata } = req.body;
            const result = await payment_service_1.default.initializePayment(userId, bookingId, metadata);
            return response_1.default.created(res, 'Payment initialized successfully', {
                payment: result.payment,
                authorizationUrl: result.authorizationUrl,
                accessCode: result.accessCode,
            });
        });
        this.verifyPayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { reference } = req.params;
            const payment = await payment_service_1.default.verifyPayment(reference);
            return response_1.default.success(res, 'Payment verified successfully', { payment });
        });
        this.handleWebhook = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const signature = req.headers['x-paystack-signature'];
            const payload = JSON.stringify(req.body);
            // Verify signature
            const isValid = payment_service_1.default.verifyWebhookSignature(payload, signature);
            if (!isValid) {
                return response_1.default.error(res, 'Invalid signature', 401);
            }
            // Process webhook
            await payment_service_1.default.handlePaystackWebhook(req.body);
            return res.status(200).send('OK');
        });
        this.getPaymentById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { paymentId } = req.params;
            const payment = await payment_service_1.default.getPaymentById(paymentId);
            return response_1.default.success(res, 'Payment retrieved successfully', { payment });
        });
        this.getUserPayments = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await payment_service_1.default.getUserPayments(userId, page, limit);
            return response_1.default.paginated(res, 'Payments retrieved successfully', result.payments, page, limit, result.total);
        });
        // ==================== ORDER PAYMENT ENDPOINTS ====================
        this.initializeOrderPayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const { orderId } = req.params;
            const { metadata } = req.body;
            const result = await payment_service_1.default.initializeOrderPayment(userId, orderId, metadata);
            return response_1.default.created(res, 'Order payment initialized successfully', {
                payment: result.payment,
                authorizationUrl: result.authorizationUrl,
                reference: result.reference,
                accessCode: result.accessCode,
            });
        });
        this.verifyOrderPayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId, reference } = req.params;
            const result = await payment_service_1.default.verifyOrderPayment(orderId, reference);
            return response_1.default.success(res, 'Order payment verified successfully', result);
        });
        this.releaseOrderPayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const adminId = req.user.id;
            const payment = await payment_service_1.default.releaseOrderPayment(orderId, adminId);
            return response_1.default.success(res, 'Order payment released to seller', { payment });
        });
        this.refundOrderPayment = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orderId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const payment = await payment_service_1.default.refundOrderPayment(orderId, adminId, reason);
            return response_1.default.success(res, 'Order payment refunded', { payment });
        });
        /**
         * Pay for order using wallet
         */
        this.payOrderFromWallet = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const customerId = req.user.id;
            const { orderId } = req.params;
            const result = await payment_service_1.default.payOrderFromWallet(orderId, customerId);
            return response_1.default.success(res, 'Order paid successfully from wallet', result);
        });
        /**
         * Check if can pay order from wallet
         */
        this.canPayOrderFromWallet = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const customerId = req.user.id;
            const { orderId } = req.params;
            const result = await payment_service_1.default.canPayOrderFromWallet(orderId, customerId);
            return response_1.default.success(res, 'Wallet balance checked successfully', result);
        });
    }
}
class WalletController {
    constructor() {
        // Wallet endpoints
        this.getBalance = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const balance = await wallet_service_1.default.getBalance(userId);
            return response_1.default.success(res, 'Balance retrieved successfully', { balance });
        });
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
            const result = await wallet_service_1.default.getTransactions(userId, filters, page, limit);
            return response_1.default.paginated(res, 'Transactions retrieved successfully', result.transactions, page, limit, result.total);
        });
        this.getWalletStats = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const stats = await wallet_service_1.default.getWalletStats(userId);
            return response_1.default.success(res, 'Wallet statistics retrieved', { stats });
        });
        this.requestWithdrawal = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const withdrawal = await wallet_service_1.default.requestWithdrawal(userId, req.body);
            return response_1.default.created(res, 'Withdrawal request submitted successfully', {
                withdrawal,
            });
        });
        this.getWithdrawalById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { withdrawalId } = req.params;
            const userId = req.user.id;
            const withdrawal = await wallet_service_1.default.getWithdrawalById(withdrawalId, userId);
            return response_1.default.success(res, 'Withdrawal retrieved successfully', { withdrawal });
        });
        this.getUserWithdrawals = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await wallet_service_1.default.getUserWithdrawals(userId, page, limit);
            return response_1.default.paginated(res, 'Withdrawals retrieved successfully', result.withdrawals, page, limit, result.total);
        });
        // Admin endpoints
        this.getAllWithdrawals = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await wallet_service_1.default.getAllWithdrawals(filters, page, limit);
            return response_1.default.paginated(res, 'Withdrawals retrieved successfully', result.withdrawals, page, limit, result.total);
        });
        this.processWithdrawal = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { withdrawalId } = req.params;
            const adminId = req.user.id;
            const withdrawal = await wallet_service_1.default.processWithdrawal(withdrawalId, adminId);
            return response_1.default.success(res, 'Withdrawal processing initiated', { withdrawal });
        });
        this.rejectWithdrawal = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { withdrawalId } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;
            const withdrawal = await wallet_service_1.default.rejectWithdrawal(withdrawalId, adminId, reason);
            return response_1.default.success(res, 'Withdrawal rejected', { withdrawal });
        });
    }
}
exports.paymentController = new PaymentController();
exports.walletController = new WalletController();
//# sourceMappingURL=payment.controller.js.map