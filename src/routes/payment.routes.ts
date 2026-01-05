import { Router } from 'express';
import { paymentController, walletController } from '../controllers/payment.controller';
import walletFundingController from '../controllers/walletFunding.controller';
import { authenticate, requireVendor, requireAdmin } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import { param } from 'express-validator';
import {
  initializePaymentValidation,
  paymentReferenceValidation,
  paymentIdValidation,
  withdrawalRequestValidation,
  withdrawalIdValidation,
  rejectWithdrawalValidation,
  getTransactionsValidation,
  getWithdrawalsValidation,
} from '../validations/payment.validation';
import {
  initializeWalletFundingValidation,
  verifyWalletFundingValidation,
  creditWalletValidation,
  debitWalletValidation,
  verifyBankAccountValidation,
  getBankListValidation
} from '../validations/walletFunding.validation';

const router = Router();



/**
 * @route   POST /api/v1/payments/wallet/verify-account
 * @desc    Verify bank account using Paystack
 * @access  Private
 */
router.post(
  '/wallet/verify-account',
  authenticate,
  validate(verifyBankAccountValidation),
  walletFundingController.verifyBankAccount
);

/**
 * @route   GET /api/v1/payments/wallet/banks
 * @desc    Get list of Nigerian banks from Paystack
 * @access  Private
 */
router.get(
  '/wallet/banks',
  authenticate,
  validate(getBankListValidation),
  walletFundingController.getBankList
);

// ==================== PAYMENT ROUTES (BOOKINGS) ====================

/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment for booking
 * @access  Private (Client)
 */
router.post(
  '/initialize',
  authenticate,
  validate(initializePaymentValidation),
  paymentController.initializePayment
);

/**
 * @route   GET /api/v1/payments/verify/:reference
 * @desc    Verify payment
 * @access  Public (called by Paystack callback)
 */
router.get(
  '/verify/:reference',
  validate(paymentReferenceValidation),
  paymentController.verifyPayment
);

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Paystack webhook handler
 * @access  Public (Paystack only)
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * @route   GET /api/v1/payments/my-payments
 * @desc    Get user payments
 * @access  Private
 */
router.get(
  '/my-payments',
  authenticate,
  validatePagination,
  paymentController.getUserPayments
);

/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment by ID
 * @access  Private
 */
router.get(
  '/:paymentId',
  authenticate,
  validate(paymentIdValidation),
  paymentController.getPaymentById
);

// ==================== 💰 ORDER PAYMENT ROUTES ====================

/**
 * @route   POST /api/v1/payments/orders/:orderId/initialize
 * @desc    Initialize order payment (Card via Paystack)
 * @access  Private (Customer)
 */
router.post(
  '/orders/:orderId/initialize',
  authenticate,
  validate([
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID'),
  ]),
  paymentController.initializeOrderPayment
);

/**
 * @route   GET /api/v1/payments/orders/:orderId/verify/:reference
 * @desc    Verify order payment
 * @access  Private
 */
router.get(
  '/orders/:orderId/verify/:reference',
  authenticate,
  validate([
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID'),
    param('reference')
      .notEmpty()
      .withMessage('Reference is required')
      .isString()
      .withMessage('Reference must be a string'),
  ]),
  paymentController.verifyOrderPayment
);

/**
 * @route   POST /api/v1/payments/orders/:orderId/wallet/pay
 * @desc    Pay for order using wallet
 * @access  Private (Customer)
 */
router.post(
  '/orders/:orderId/wallet/pay',
  authenticate,
  validate([
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID'),
  ]),
  paymentController.payOrderFromWallet
);

/**
 * @route   GET /api/v1/payments/orders/:orderId/wallet/check
 * @desc    Check if can pay order from wallet
 * @access  Private (Customer)
 */
router.get(
  '/orders/:orderId/wallet/check',
  authenticate,
  validate([
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID'),
  ]),
  paymentController.canPayOrderFromWallet
);

/**
 * @route   POST /api/v1/payments/orders/:orderId/release
 * @desc    Release payment to seller after order completion
 * @access  Private (Admin/System)
 */
router.post(
  '/orders/:orderId/release',
  authenticate,
  validate([
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID'),
  ]),
  paymentController.releaseOrderPayment
);

/**
 * @route   POST /api/v1/payments/orders/:orderId/refund
 * @desc    Refund order payment
 * @access  Private (Admin)
 */
router.post(
  '/orders/:orderId/refund',
  authenticate,
  validate([
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID'),
  ]),
  paymentController.refundOrderPayment
);

// ==================== 💵 WALLET FUNDING ROUTES ====================

/**
 * @route   POST /api/v1/wallet/fund/initialize
 * @desc    Initialize wallet funding via Paystack
 * @access  Private
 */
router.post(
  '/wallet/fund/initialize',
  authenticate,
  validate(initializeWalletFundingValidation),
  walletFundingController.initializeWalletFunding
);

/**
 * @route   GET /api/v1/wallet/fund/verify/:reference
 * @desc    Verify wallet funding payment
 * @access  Private
 */
router.get(
  '/wallet/fund/verify/:reference',
  authenticate,
  validate(verifyWalletFundingValidation),
  walletFundingController.verifyWalletFunding
);

/**
 * @route   GET /api/v1/wallet/fund/history
 * @desc    Get wallet funding history
 * @access  Private
 */
router.get(
  '/wallet/fund/history',
  authenticate,
  validatePagination,
  walletFundingController.getFundingHistory
);

/**
 * @route   POST /api/v1/wallet/fund/credit
 * @desc    Credit user wallet (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/wallet/fund/credit',
  authenticate,
  requireAdmin,
  validate(creditWalletValidation),
  walletFundingController.creditWallet
);

/**
 * @route   POST /api/v1/wallet/fund/debit
 * @desc    Debit user wallet (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/wallet/fund/debit',
  authenticate,
  requireAdmin,
  validate(debitWalletValidation),
  walletFundingController.debitWallet
);

// ==================== WALLET ROUTES ====================

/**
 * @route   GET /api/v1/wallet/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/wallet/balance', authenticate, walletController.getBalance);

/**
 * @route   GET /api/v1/wallet/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get(
  '/wallet/transactions',
  authenticate,
  validatePagination,
  validate(getTransactionsValidation),
  walletController.getTransactions
);

/**
 * @route   GET /api/v1/wallet/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/wallet/stats', authenticate, walletController.getWalletStats);

/**
 * @route   POST /api/v1/wallet/withdraw
 * @desc    Request withdrawal
 * @access  Private (Vendor)
 */
router.post(
  '/wallet/withdraw',
  authenticate,
  requireVendor,
  validate(withdrawalRequestValidation),
  walletController.requestWithdrawal
);

/**
 * @route   GET /api/v1/wallet/withdrawals/my-withdrawals
 * @desc    Get user withdrawals
 * @access  Private (Vendor)
 */
router.get(
  '/wallet/withdrawals/my-withdrawals',
  authenticate,
  requireVendor,
  validatePagination,
  walletController.getUserWithdrawals
);

/**
 * @route   GET /api/v1/wallet/withdrawals/:withdrawalId
 * @desc    Get withdrawal by ID
 * @access  Private
 */
router.get(
  '/wallet/withdrawals/:withdrawalId',
  authenticate,
  validate(withdrawalIdValidation),
  walletController.getWithdrawalById
);

// ==================== ADMIN WITHDRAWAL ROUTES ====================

/**
 * @route   GET /api/v1/wallet/withdrawals
 * @desc    Get all withdrawals (Admin)
 * @access  Private (Financial Admin)
 */
router.get(
  '/wallet/withdrawals',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getWithdrawalsValidation),
  walletController.getAllWithdrawals
);

/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post(
  '/wallet/withdrawals/:withdrawalId/process',
  authenticate,
  requireAdmin,
  validate(withdrawalIdValidation),
  walletController.processWithdrawal
);

/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/reject
 * @desc    Reject withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post(
  '/wallet/withdrawals/:withdrawalId/reject',
  authenticate,
  requireAdmin,
  validate([...withdrawalIdValidation, ...rejectWithdrawalValidation]),
  walletController.rejectWithdrawal
);

export default router;