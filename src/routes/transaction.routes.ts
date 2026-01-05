import { Router } from 'express';
import transactionController from '../controllers/transaction.controller';
import { authenticate } from '../middlewares/auth';
import { validatePagination } from '../middlewares/validate';

const router = Router();

/**
 * @route   GET /api/v1/transactions
 * @desc    Get user transactions
 * @access  Private
 */
router.get('/', authenticate, validatePagination, transactionController.getMyTransactions);

/**
 * @route   GET /api/v1/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private
 */
router.get('/stats', authenticate, transactionController.getTransactionStats);

/**
 * @route   GET /api/v1/transactions/:transactionId
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/:transactionId', authenticate, transactionController.getTransactionById);

import { requireAdmin } from '../middlewares/auth';

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/transactions/admin/stats
 * @desc    Get platform transaction statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, transactionController.getPlatformStats);

/**
 * @route   GET /api/v1/transactions/admin/all
 * @desc    Get all transactions
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  validatePagination,
  transactionController.getAllTransactions
);

/**
 * @route   GET /api/v1/transactions/admin/:transactionId
 * @desc    Get transaction by ID (admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/:transactionId',
  authenticate,
  requireAdmin,
  transactionController.getTransactionByIdAdmin
);

export default router;