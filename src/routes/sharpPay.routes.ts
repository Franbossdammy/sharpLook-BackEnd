import { Router } from 'express';
import sharpPayController from '../controllers/sharpPay.controller';
import { authenticate, requireVendor, requireFinancialAdmin } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  initializeDepositValidation,
  verifyDepositValidation,
  getTransactionsValidation,
  requestWithdrawalValidation,
  withdrawalIdValidation,
  rejectWithdrawalValidation,
  getWithdrawalsValidation,
} from '../validations/sharpPay.validation';

const router = Router();

// ==================== WALLET BALANCE ====================

/**
 * @route   GET /api/v1/sharppay/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/balance', authenticate, sharpPayController.getBalance);

// ==================== DEPOSITS ====================

/**
 * @route   POST /api/v1/sharppay/deposit/initialize
 * @desc    Initialize wallet deposit
 * @access  Private
 */
router.post(
  '/deposit/initialize',
  authenticate,
  validate(initializeDepositValidation),
  sharpPayController.initializeDeposit
);

/**
 * @route   GET /api/v1/sharppay/deposit/verify/:reference
 * @desc    Verify wallet deposit
 * @access  Private
 */
router.get(
  '/deposit/verify/:reference',
  authenticate,
  validate(verifyDepositValidation),
  sharpPayController.verifyDeposit
);

// ==================== TRANSACTIONS ====================

/**
 * @route   GET /api/v1/sharppay/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get(
  '/transactions',
  authenticate,
  validatePagination,
  validate(getTransactionsValidation),
  sharpPayController.getTransactions
);

/**
 * @route   GET /api/v1/sharppay/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/stats', authenticate, sharpPayController.getWalletStats);

// ==================== WITHDRAWALS ====================

/**
 * @route   POST /api/v1/sharppay/withdraw
 * @desc    Request withdrawal
 * @access  Private (Vendor)
 */
router.post(
  '/withdraw',
  authenticate,
  requireVendor,
  validate(requestWithdrawalValidation),
  sharpPayController.requestWithdrawal
);

/**
 * @route   GET /api/v1/sharppay/withdrawals/my-withdrawals
 * @desc    Get user withdrawals
 * @access  Private (Vendor)
 */
router.get(
  '/withdrawals/my-withdrawals',
  authenticate,
  requireVendor,
  validatePagination,
  sharpPayController.getUserWithdrawals
);

/**
 * @route   GET /api/v1/sharppay/withdrawals/:withdrawalId
 * @desc    Get withdrawal by ID
 * @access  Private
 */
router.get(
  '/withdrawals/:withdrawalId',
  authenticate,
  validate(withdrawalIdValidation),
  sharpPayController.getWithdrawalById
);

// ==================== ADMIN WITHDRAWAL ROUTES ====================

/**
 * @route   GET /api/v1/sharppay/withdrawals
 * @desc    Get all withdrawals (Admin)
 * @access  Private (Financial Admin)
 */
router.get(
  '/withdrawals',
  authenticate,
  requireFinancialAdmin,
  validatePagination,
  validate(getWithdrawalsValidation),
  sharpPayController.getAllWithdrawals
);

/**
 * @route   POST /api/v1/sharppay/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post(
  '/withdrawals/:withdrawalId/process',
  authenticate,
  requireFinancialAdmin,
  validate(withdrawalIdValidation),
  sharpPayController.processWithdrawal
);

/**
 * @route   POST /api/v1/sharppay/withdrawals/:withdrawalId/reject
 * @desc    Reject withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post(
  '/withdrawals/:withdrawalId/reject',
  authenticate,
  requireFinancialAdmin,
  validate([...withdrawalIdValidation, ...rejectWithdrawalValidation]),
  sharpPayController.rejectWithdrawal
);

export default router;