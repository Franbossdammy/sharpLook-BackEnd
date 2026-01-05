import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import subscriptionService from '../services/subscription.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class SubscriptionController {
  public createSubscription = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      const { plan } = req.body;
      
      const subscription = await subscriptionService.createSubscription(vendorId, plan);
      
      return ResponseHandler.created(res, 'Subscription created', { subscription });
    }
  );

  public getMySubscription = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const vendorId = req.user!.id;
      
      const subscription = await subscriptionService.getVendorSubscription(vendorId);
      
      return ResponseHandler.success(res, 'Subscription retrieved', { subscription });
    }
  );

  public paySubscription = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { subscriptionId } = req.params;
    // const vendorId = req.user!.id;
    const { paymentReference } = req.body;
    
    const subscription = await subscriptionService.paySubscription(
      subscriptionId,
      paymentReference || `SUB-${Date.now()}`
    );
    
    return ResponseHandler.success(res, 'Subscription payment successful', { subscription });
  }
);

  public cancelSubscription = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { subscriptionId } = req.params;
      const vendorId = req.user!.id;
      
      const subscription = await subscriptionService.cancelSubscription(
        subscriptionId,
        vendorId
      );
      
      return ResponseHandler.success(res, 'Subscription cancelled', { subscription });
    }
  );

  public changeSubscriptionPlan = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { subscriptionId } = req.params;
      const vendorId = req.user!.id;
      const { plan } = req.body;
      
      const subscription = await subscriptionService.changeSubscriptionPlan(
        subscriptionId,
        vendorId,
        plan
      );
      
      return ResponseHandler.success(res, 'Subscription plan changed', { subscription });
    }
  );

  // Admin endpoints
  public getAllSubscriptions = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as any,
        plan: req.query.plan as any,
      };
      
      const result = await subscriptionService.getAllSubscriptions(filters, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Subscriptions retrieved',
        result.subscriptions,
        page,
        limit,
        result.total
      );
    }
  );

  public getSubscriptionStats = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const stats = await subscriptionService.getSubscriptionStats();
      
      return ResponseHandler.success(res, 'Subscription stats retrieved', { stats });
    }
  );
}

export default new SubscriptionController();
