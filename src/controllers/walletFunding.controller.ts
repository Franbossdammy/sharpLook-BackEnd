import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import walletFundingService from '../services/walletFunding.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';
import paystackHelper from '../utils/paystackHelper';


class WalletFundingController {


  // ADD THESE METHODS TO YOUR EXISTING payment.controller.ts (walletController)


/**
 * Verify bank account
 * POST /api/v1/payments/wallet/verify-account
 */
public verifyBankAccount = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      throw new BadRequestError('Account number and bank code are required');
    }

    // Validate account number
    if (accountNumber.length !== 10) {
      throw new BadRequestError('Account number must be 10 digits');
    }

    try {
      const result = await paystackHelper.verifyBankAccount(accountNumber, bankCode);

      logger.info(`✅ Account verified: ${result.account_name} (${accountNumber})`);

      return ResponseHandler.success(
        res,
        'Account verified successfully',
        {
          accountNumber,
          accountName: result.account_name,
          bankCode,
        }
      );
    } catch (error: any) {
      logger.error('❌ Bank account verification failed:', error);
      throw new BadRequestError(
        error.message || 'Unable to verify account details. Please check your account number and bank.'
      );
    }
  }
);

/**
 * Get list of banks
 * GET /api/v1/payments/wallet/banks
 */
public getBankList = asyncHandler(
  async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
      const banks = await paystackHelper.getBanks();

      // Filter for Nigerian banks and format response
      const nigerianBanks = banks
        .filter((bank: any) => bank.country === 'Nigeria')
        .map((bank: any) => ({
          name: bank.name,
          code: bank.code,
          id: bank.id,
        }));

      return ResponseHandler.success(
        res,
        'Banks retrieved successfully',
        { banks: nigerianBanks }
      );
    } catch (error: any) {
      logger.error('❌ Failed to fetch banks:', error);
      throw new BadRequestError('Failed to fetch bank list');
    }
  }
)
  /**
   * Initialize wallet funding
   * POST /api/v1/wallet/fund/initialize
   */
  public initializeWalletFunding = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { amount, metadata } = req.body;

      const result = await walletFundingService.initializeWalletFunding(
        userId,
        amount,
        metadata
      );

      return ResponseHandler.success(
        res,
        'Wallet funding initialized successfully',
        {
          payment: {
            id: result.payment._id,
            amount: result.payment.amount,
            reference: result.reference,
            status: result.payment.status,
          },
          authorizationUrl: result.authorizationUrl,
          accessCode: result.accessCode,
          reference: result.reference,
        }
      );
    }
  );

  /**
   * Verify wallet funding payment
   * GET /api/v1/wallet/fund/verify/:reference
   */
  public verifyWalletFunding = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reference } = req.params;

      const result = await walletFundingService.verifyWalletFunding(reference);

      if (result.success) {
        return ResponseHandler.success(
          res,
          'Wallet funded successfully',
          {
            payment: {
              id: result.payment._id,
              amount: result.payment.amount,
              reference: result.payment.reference,
              status: result.payment.status,
              paidAt: result.payment.paidAt,
            },
            wallet: {
              balance: result.user.walletBalance,
            },
            message: `₦${result.payment.amount.toLocaleString()} has been added to your wallet`,
          }
        );
      } else {
        return ResponseHandler.error(
          res,
          'Wallet funding failed',
          400,
          {
            payment: {
              id: result.payment._id,
              reference: result.payment.reference,
              status: result.payment.status,
            },
            message: 'Payment verification failed. Please try again.',
          }
        );
      }
    }
  );

  /**
   * Get wallet funding history
   * GET /api/v1/wallet/fund/history
   */
  public getFundingHistory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await walletFundingService.getFundingHistory(userId, page, limit);

      return ResponseHandler.paginated(
        res,
        'Funding history retrieved successfully',
        result.transactions,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Credit user wallet (Admin only)
   * POST /api/v1/wallet/fund/credit
   */
  public creditWallet = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const adminId = req.user!.id;
      const { userId, amount, description, metadata } = req.body;

      if (!userId || !amount) {
        throw new BadRequestError('User ID and amount are required');
      }

      const result = await walletFundingService.creditWallet(
        userId,
        amount,
        description || `Wallet credited by admin`,
        adminId,
        metadata
      );

      logger.info(`Admin ${adminId} credited ₦${amount} to user ${userId}`);

      return ResponseHandler.success(
        res,
        'Wallet credited successfully',
        {
          user: {
            id: result.user._id,
            email: result.user.email,
            previousBalance: result.previousBalance,
            newBalance: result.newBalance,
            creditedAmount: amount,
          },
          transaction: {
            id: result.transaction._id,
            reference: result.transaction.reference,
            description: result.transaction.description,
          },
        }
      );
    }
  );

  /**
   * Debit user wallet (Admin only)
   * POST /api/v1/wallet/fund/debit
   */
  public debitWallet = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const adminId = req.user!.id;
      const { userId, amount, description, metadata } = req.body;

      if (!userId || !amount) {
        throw new BadRequestError('User ID and amount are required');
      }

      const result = await walletFundingService.debitWallet(
        userId,
        amount,
        description || `Wallet debited by admin`,
        adminId,
        metadata
      );

      logger.info(`Admin ${adminId} debited ₦${amount} from user ${userId}`);

      return ResponseHandler.success(
        res,
        'Wallet debited successfully',
        {
          user: {
            id: result.user._id,
            email: result.user.email,
            previousBalance: result.previousBalance,
            newBalance: result.newBalance,
            debitedAmount: amount,
          },
          transaction: {
            id: result.transaction._id,
            reference: result.transaction.reference,
            description: result.transaction.description,
          },
        }
      );
    }
  );
}

export default new WalletFundingController();