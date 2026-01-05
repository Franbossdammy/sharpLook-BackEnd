import { Response, NextFunction } from 'express';
declare class SharpPayController {
    /**
     * Get wallet balance
     */
    getBalance: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Initialize wallet deposit
     */
    initializeDeposit: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Verify wallet deposit
     */
    verifyDeposit: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get wallet transactions
     */
    getTransactions: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get wallet statistics
     */
    getWalletStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Request withdrawal
     */
    requestWithdrawal: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get withdrawal by ID
     */
    getWithdrawalById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get user withdrawals
     */
    getUserWithdrawals: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all withdrawals (Admin)
     */
    getAllWithdrawals: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Process withdrawal (Admin)
     */
    processWithdrawal: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Reject withdrawal (Admin)
     */
    rejectWithdrawal: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: SharpPayController;
export default _default;
//# sourceMappingURL=sharpPay.controller.d.ts.map