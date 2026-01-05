import { Response, NextFunction } from 'express';
declare class WalletFundingController {
    /**
     * Verify bank account
     * POST /api/v1/payments/wallet/verify-account
     */
    verifyBankAccount: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get list of banks
     * GET /api/v1/payments/wallet/banks
     */
    getBankList: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Initialize wallet funding
     * POST /api/v1/wallet/fund/initialize
     */
    initializeWalletFunding: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Verify wallet funding payment
     * GET /api/v1/wallet/fund/verify/:reference
     */
    verifyWalletFunding: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get wallet funding history
     * GET /api/v1/wallet/fund/history
     */
    getFundingHistory: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Credit user wallet (Admin only)
     * POST /api/v1/wallet/fund/credit
     */
    creditWallet: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Debit user wallet (Admin only)
     * POST /api/v1/wallet/fund/debit
     */
    debitWallet: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: WalletFundingController;
export default _default;
//# sourceMappingURL=walletFunding.controller.d.ts.map