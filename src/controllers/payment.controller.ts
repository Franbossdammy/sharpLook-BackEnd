import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import paymentService from '../services/payment.service';
import walletService from '../services/wallet.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class PaymentController {
  // ==================== BOOKING PAYMENT ENDPOINTS ====================
  
  public initializePayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { bookingId, metadata } = req.body;
      
      const result = await paymentService.initializePayment(userId, bookingId, metadata);
      
      return ResponseHandler.created(res, 'Payment initialized successfully', {
        payment: result.payment,
        authorizationUrl: result.authorizationUrl,
        accessCode: result.accessCode,
      });
    }
  );

  public verifyPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { reference } = req.params;
      
      const payment = await paymentService.verifyPayment(reference);
      
      return ResponseHandler.success(res, 'Payment verified successfully', { payment });
    }
  );

  public handleWebhook = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const signature = req.headers['x-paystack-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      // Verify signature
      const isValid = paymentService.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        return ResponseHandler.error(res, 'Invalid signature', 401);
      }
      
      // Process webhook
      await paymentService.handlePaystackWebhook(req.body);
      
      return res.status(200).send('OK');
    }
  );

  public getPaymentById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { paymentId } = req.params;
      
      const payment = await paymentService.getPaymentById(paymentId);
      
      return ResponseHandler.success(res, 'Payment retrieved successfully', { payment });
    }
  );

  public getUserPayments = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await paymentService.getUserPayments(userId, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Payments retrieved successfully',
        result.payments,
        page,
        limit,
        result.total
      );
    }
  );

  // ==================== ORDER PAYMENT ENDPOINTS ====================

  public initializeOrderPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { orderId } = req.params;
      const { metadata } = req.body;
      
      const result = await paymentService.initializeOrderPayment(userId, orderId, metadata);
      
      return ResponseHandler.created(res, 'Order payment initialized successfully', {
        payment: result.payment,
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        accessCode: result.accessCode,
      });
    }
  );

  public verifyOrderPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId, reference } = req.params;
      
      const result = await paymentService.verifyOrderPayment(orderId, reference);
      
      return ResponseHandler.success(res, 'Order payment verified successfully', result);
    }
  );

  public releaseOrderPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;
      const adminId = req.user!.id;
      
      const payment = await paymentService.releaseOrderPayment(orderId, adminId);
      
      return ResponseHandler.success(res, 'Order payment released to seller', { payment });
    }
  );

  public refundOrderPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;
      
      const payment = await paymentService.refundOrderPayment(orderId, adminId, reason);
      
      return ResponseHandler.success(res, 'Order payment refunded', { payment });
    }
  );

  
 
  /**
   * Pay for order using wallet
   */
  public payOrderFromWallet = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const customerId = req.user!.id;
      const { orderId } = req.params;

      const result = await paymentService.payOrderFromWallet(orderId, customerId);

      return ResponseHandler.success(
        res,
        'Order paid successfully from wallet',
        result
      );
    }
  );

  /**
   * Check if can pay order from wallet
   */
  public canPayOrderFromWallet = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const customerId = req.user!.id;
      const { orderId } = req.params;

      const result = await paymentService.canPayOrderFromWallet(orderId, customerId);

      return ResponseHandler.success(
        res,
        'Wallet balance checked successfully',
        result
      );
    }
  );


}

class WalletController {
  // Wallet endpoints
  
  public getBalance = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const balance = await walletService.getBalance(userId);
      
      return ResponseHandler.success(res, 'Balance retrieved successfully', { balance });
    }
  );

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
      
      const result = await walletService.getTransactions(userId, filters, page, limit);
      
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

  public getWalletStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const stats = await walletService.getWalletStats(userId);
      
      return ResponseHandler.success(res, 'Wallet statistics retrieved', { stats });
    }
  );

  public requestWithdrawal = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const withdrawal = await walletService.requestWithdrawal(userId, req.body);
      
      return ResponseHandler.created(res, 'Withdrawal request submitted successfully', {
        withdrawal,
      });
    }
  );

  public getWithdrawalById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { withdrawalId } = req.params;
      const userId = req.user!.id;
      
      const withdrawal = await walletService.getWithdrawalById(withdrawalId, userId);
      
      return ResponseHandler.success(res, 'Withdrawal retrieved successfully', { withdrawal });
    }
  );

  public getUserWithdrawals = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await walletService.getUserWithdrawals(userId, page, limit);
      
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

  // Admin endpoints
  
  public getAllWithdrawals = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await walletService.getAllWithdrawals(filters, page, limit);
      
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

  public processWithdrawal = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { withdrawalId } = req.params;
      const adminId = req.user!.id;
      
      const withdrawal = await walletService.processWithdrawal(withdrawalId, adminId);
      
      return ResponseHandler.success(res, 'Withdrawal processing initiated', { withdrawal });
    }
  );

  public rejectWithdrawal = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { withdrawalId } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;
      
      const withdrawal = await walletService.rejectWithdrawal(withdrawalId, adminId, reason);
      
      return ResponseHandler.success(res, 'Withdrawal rejected', { withdrawal });
    }
  );
}

export const paymentController = new PaymentController();
export const walletController = new WalletController();