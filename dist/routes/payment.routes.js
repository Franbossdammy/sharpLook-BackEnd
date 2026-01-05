"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const walletFunding_controller_1 = __importDefault(require("../controllers/walletFunding.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const express_validator_1 = require("express-validator");
const payment_validation_1 = require("../validations/payment.validation");
const walletFunding_validation_1 = require("../validations/walletFunding.validation");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/payments/wallet/verify-account
 * @desc    Verify bank account using Paystack
 * @access  Private
 */
router.post('/wallet/verify-account', auth_1.authenticate, (0, validate_1.validate)(walletFunding_validation_1.verifyBankAccountValidation), walletFunding_controller_1.default.verifyBankAccount);
/**
 * @route   GET /api/v1/payments/wallet/banks
 * @desc    Get list of Nigerian banks from Paystack
 * @access  Private
 */
router.get('/wallet/banks', auth_1.authenticate, (0, validate_1.validate)(walletFunding_validation_1.getBankListValidation), walletFunding_controller_1.default.getBankList);
// ==================== PAYMENT ROUTES (BOOKINGS) ====================
/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment for booking
 * @access  Private (Client)
 */
router.post('/initialize', auth_1.authenticate, (0, validate_1.validate)(payment_validation_1.initializePaymentValidation), payment_controller_1.paymentController.initializePayment);
/**
 * @route   GET /api/v1/payments/verify/:reference
 * @desc    Verify payment
 * @access  Public (called by Paystack callback)
 */
router.get('/verify/:reference', (0, validate_1.validate)(payment_validation_1.paymentReferenceValidation), payment_controller_1.paymentController.verifyPayment);
/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Paystack webhook handler
 * @access  Public (Paystack only)
 */
router.post('/webhook', payment_controller_1.paymentController.handleWebhook);
/**
 * @route   GET /api/v1/payments/my-payments
 * @desc    Get user payments
 * @access  Private
 */
router.get('/my-payments', auth_1.authenticate, validate_1.validatePagination, payment_controller_1.paymentController.getUserPayments);
/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:paymentId', auth_1.authenticate, (0, validate_1.validate)(payment_validation_1.paymentIdValidation), payment_controller_1.paymentController.getPaymentById);
// ==================== 💰 ORDER PAYMENT ROUTES ====================
/**
 * @route   POST /api/v1/payments/orders/:orderId/initialize
 * @desc    Initialize order payment (Card via Paystack)
 * @access  Private (Customer)
 */
router.post('/orders/:orderId/initialize', auth_1.authenticate, (0, validate_1.validate)([
    (0, express_validator_1.param)('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .isMongoId()
        .withMessage('Invalid order ID'),
]), payment_controller_1.paymentController.initializeOrderPayment);
/**
 * @route   GET /api/v1/payments/orders/:orderId/verify/:reference
 * @desc    Verify order payment
 * @access  Private
 */
router.get('/orders/:orderId/verify/:reference', auth_1.authenticate, (0, validate_1.validate)([
    (0, express_validator_1.param)('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .isMongoId()
        .withMessage('Invalid order ID'),
    (0, express_validator_1.param)('reference')
        .notEmpty()
        .withMessage('Reference is required')
        .isString()
        .withMessage('Reference must be a string'),
]), payment_controller_1.paymentController.verifyOrderPayment);
/**
 * @route   POST /api/v1/payments/orders/:orderId/wallet/pay
 * @desc    Pay for order using wallet
 * @access  Private (Customer)
 */
router.post('/orders/:orderId/wallet/pay', auth_1.authenticate, (0, validate_1.validate)([
    (0, express_validator_1.param)('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .isMongoId()
        .withMessage('Invalid order ID'),
]), payment_controller_1.paymentController.payOrderFromWallet);
/**
 * @route   GET /api/v1/payments/orders/:orderId/wallet/check
 * @desc    Check if can pay order from wallet
 * @access  Private (Customer)
 */
router.get('/orders/:orderId/wallet/check', auth_1.authenticate, (0, validate_1.validate)([
    (0, express_validator_1.param)('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .isMongoId()
        .withMessage('Invalid order ID'),
]), payment_controller_1.paymentController.canPayOrderFromWallet);
/**
 * @route   POST /api/v1/payments/orders/:orderId/release
 * @desc    Release payment to seller after order completion
 * @access  Private (Admin/System)
 */
router.post('/orders/:orderId/release', auth_1.authenticate, (0, validate_1.validate)([
    (0, express_validator_1.param)('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .isMongoId()
        .withMessage('Invalid order ID'),
]), payment_controller_1.paymentController.releaseOrderPayment);
/**
 * @route   POST /api/v1/payments/orders/:orderId/refund
 * @desc    Refund order payment
 * @access  Private (Admin)
 */
router.post('/orders/:orderId/refund', auth_1.authenticate, (0, validate_1.validate)([
    (0, express_validator_1.param)('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .isMongoId()
        .withMessage('Invalid order ID'),
]), payment_controller_1.paymentController.refundOrderPayment);
// ==================== 💵 WALLET FUNDING ROUTES ====================
/**
 * @route   POST /api/v1/wallet/fund/initialize
 * @desc    Initialize wallet funding via Paystack
 * @access  Private
 */
router.post('/wallet/fund/initialize', auth_1.authenticate, (0, validate_1.validate)(walletFunding_validation_1.initializeWalletFundingValidation), walletFunding_controller_1.default.initializeWalletFunding);
/**
 * @route   GET /api/v1/wallet/fund/verify/:reference
 * @desc    Verify wallet funding payment
 * @access  Private
 */
router.get('/wallet/fund/verify/:reference', auth_1.authenticate, (0, validate_1.validate)(walletFunding_validation_1.verifyWalletFundingValidation), walletFunding_controller_1.default.verifyWalletFunding);
/**
 * @route   GET /api/v1/wallet/fund/history
 * @desc    Get wallet funding history
 * @access  Private
 */
router.get('/wallet/fund/history', auth_1.authenticate, validate_1.validatePagination, walletFunding_controller_1.default.getFundingHistory);
/**
 * @route   POST /api/v1/wallet/fund/credit
 * @desc    Credit user wallet (Admin only)
 * @access  Private (Admin)
 */
router.post('/wallet/fund/credit', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(walletFunding_validation_1.creditWalletValidation), walletFunding_controller_1.default.creditWallet);
/**
 * @route   POST /api/v1/wallet/fund/debit
 * @desc    Debit user wallet (Admin only)
 * @access  Private (Admin)
 */
router.post('/wallet/fund/debit', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(walletFunding_validation_1.debitWalletValidation), walletFunding_controller_1.default.debitWallet);
// ==================== WALLET ROUTES ====================
/**
 * @route   GET /api/v1/wallet/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/wallet/balance', auth_1.authenticate, payment_controller_1.walletController.getBalance);
/**
 * @route   GET /api/v1/wallet/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get('/wallet/transactions', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(payment_validation_1.getTransactionsValidation), payment_controller_1.walletController.getTransactions);
/**
 * @route   GET /api/v1/wallet/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/wallet/stats', auth_1.authenticate, payment_controller_1.walletController.getWalletStats);
/**
 * @route   POST /api/v1/wallet/withdraw
 * @desc    Request withdrawal
 * @access  Private (Vendor)
 */
router.post('/wallet/withdraw', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)(payment_validation_1.withdrawalRequestValidation), payment_controller_1.walletController.requestWithdrawal);
/**
 * @route   GET /api/v1/wallet/withdrawals/my-withdrawals
 * @desc    Get user withdrawals
 * @access  Private (Vendor)
 */
router.get('/wallet/withdrawals/my-withdrawals', auth_1.authenticate, auth_1.requireVendor, validate_1.validatePagination, payment_controller_1.walletController.getUserWithdrawals);
/**
 * @route   GET /api/v1/wallet/withdrawals/:withdrawalId
 * @desc    Get withdrawal by ID
 * @access  Private
 */
router.get('/wallet/withdrawals/:withdrawalId', auth_1.authenticate, (0, validate_1.validate)(payment_validation_1.withdrawalIdValidation), payment_controller_1.walletController.getWithdrawalById);
// ==================== ADMIN WITHDRAWAL ROUTES ====================
/**
 * @route   GET /api/v1/wallet/withdrawals
 * @desc    Get all withdrawals (Admin)
 * @access  Private (Financial Admin)
 */
router.get('/wallet/withdrawals', auth_1.authenticate, auth_1.requireAdmin, validate_1.validatePagination, (0, validate_1.validate)(payment_validation_1.getWithdrawalsValidation), payment_controller_1.walletController.getAllWithdrawals);
/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post('/wallet/withdrawals/:withdrawalId/process', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(payment_validation_1.withdrawalIdValidation), payment_controller_1.walletController.processWithdrawal);
/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/reject
 * @desc    Reject withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post('/wallet/withdrawals/:withdrawalId/reject', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...payment_validation_1.withdrawalIdValidation, ...payment_validation_1.rejectWithdrawalValidation]), payment_controller_1.walletController.rejectWithdrawal);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map