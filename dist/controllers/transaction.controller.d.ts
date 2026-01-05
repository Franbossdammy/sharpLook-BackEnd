import { Response, NextFunction } from 'express';
declare class TransactionController {
    getMyTransactions: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getTransactionStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getTransactionById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
   * Get all transactions (admin)
   * GET /api/v1/transactions/admin/all
   */
    getAllTransactions: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get platform transaction statistics (admin)
     * GET /api/v1/transactions/admin/stats
     */
    getPlatformStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get transaction by ID (admin)
     * GET /api/v1/transactions/admin/:transactionId
     */
    getTransactionByIdAdmin: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: TransactionController;
export default _default;
//# sourceMappingURL=transaction.controller.d.ts.map