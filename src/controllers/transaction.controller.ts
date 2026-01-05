import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import transactionService from '../services/transaction.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class TransactionController {
  public getMyTransactions = asyncHandler(
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

      const result = await transactionService.getUserTransactions(
        userId,
        filters,
        page,
        limit
      );

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

  public getTransactionStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const stats = await transactionService.getTransactionStats(userId, startDate, endDate);

      return ResponseHandler.success(res, 'Transaction statistics retrieved', { stats });
    }
  );

  public getTransactionById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { transactionId } = req.params;
      const userId = req.user!.id;

      const transaction = await transactionService.getTransactionById(transactionId, userId);

      return ResponseHandler.success(res, 'Transaction retrieved successfully', {
        transaction,
      });
    }
  );

  /**
 * Get all transactions (admin)
 * GET /api/v1/transactions/admin/all
 */
public getAllTransactions = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters: any = {
      userId: req.query.userId as string,
      type: req.query.type as any,
      status: req.query.status as any,
    };

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const result = await transactionService.getAllTransactions(filters, page, limit);

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
 * Get platform transaction statistics (admin)
 * GET /api/v1/transactions/admin/stats
 */
public getPlatformStats = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await transactionService.getPlatformStats(startDate, endDate);

    return ResponseHandler.success(res, 'Platform statistics retrieved', { stats });
  }
);

/**
 * Get transaction by ID (admin)
 * GET /api/v1/transactions/admin/:transactionId
 */
public getTransactionByIdAdmin = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { transactionId } = req.params;

    const transaction = await transactionService.getTransactionByIdAdmin(transactionId);

    return ResponseHandler.success(res, 'Transaction retrieved successfully', {
      transaction,
    });
  }
);
}

export default new TransactionController();