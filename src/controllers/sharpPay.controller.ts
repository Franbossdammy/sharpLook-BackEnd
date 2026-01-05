import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import sharpPayService from '../services/sharpPay.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class SharpPayController {
  // ==================== BALANCE ====================
  
  /**
   * Get wallet balance
   */
  public getBalance = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const balance = await sharpPayService.getBalance(userId);
      
      return ResponseHandler.success(res, 'Wallet balance retrieved successfully', balance);
    }
  );

  // ==================== DEPOSITS ====================
  
  /**
   * Initialize wallet deposit
   */
  public initializeDeposit = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { amount, metadata } = req.body;
      
      const result = await sharpPayService.initializeDeposit(userId, amount, metadata);
      
      return ResponseHandler.created(res, 'Wallet deposit initialized successfully', result);
    }
  );

  /**
   * Verify wallet deposit
   */
  public verifyDeposit = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reference } = req.params;
      
      const result = await sharpPayService.verifyDeposit(reference);
      
      return ResponseHandler.success(res, 'Wallet deposit verified successfully', result);
    }
  );

  // ==================== TRANSACTIONS ====================
  
  /**
   * Get wallet transactions
   */
  public getTransactions = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        type: req.query.type as any,
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await sharpPayService.getTransactions(userId, filters, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Transactions retrieved successfully',
        result.transactions,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get wallet statistics
   */
  public getWalletStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const stats = await sharpPayService.getWalletStats(userId);
      
      return ResponseHandler.success(res, 'Wallet statistics retrieved successfully', { stats });
    }
  );

  // ==================== WITHDRAWALS ====================
  
  /**
   * Request withdrawal
   */
  public requestWithdrawal = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const withdrawal = await sharpPayService.requestWithdrawal(userId, req.body);
      
      return ResponseHandler.created(res, 'Withdrawal request submitted successfully', {
        withdrawal,
      });
    }
  );

  /**
   * Get withdrawal by ID
   */
  public getWithdrawalById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { withdrawalId } = req.params;
      const userId = req.user!.id;
      
      const withdrawal = await sharpPayService.getWithdrawalById(withdrawalId, userId);
      
      return ResponseHandler.success(res, 'Withdrawal retrieved successfully', { withdrawal });
    }
  );

  /**
   * Get user withdrawals
   */
  public getUserWithdrawals = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await sharpPayService.getUserWithdrawals(userId, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Withdrawals retrieved successfully',
        result.withdrawals,
        page,
        limit,
        result.total
      );
    }
  );

  // ==================== ADMIN ENDPOINTS ====================
  
  /**
   * Get all withdrawals (Admin)
   */
  public getAllWithdrawals = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await sharpPayService.getAllWithdrawals(filters, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Withdrawals retrieved successfully',
        result.withdrawals,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Process withdrawal (Admin)
   */
  public processWithdrawal = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { withdrawalId } = req.params;
      const adminId = req.user!.id;
      
      const withdrawal = await sharpPayService.processWithdrawal(withdrawalId, adminId);
      
      return ResponseHandler.success(res, 'Withdrawal processing initiated', { withdrawal });
    }
  );

  /**
   * Reject withdrawal (Admin)
   */
  public rejectWithdrawal = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { withdrawalId } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;
      
      const withdrawal = await sharpPayService.rejectWithdrawal(withdrawalId, adminId, reason);
      
      return ResponseHandler.success(res, 'Withdrawal rejected', { withdrawal });
    }
  );
}

export default new SharpPayController();