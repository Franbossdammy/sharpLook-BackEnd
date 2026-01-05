import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import referralService from '../services/referral.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class ReferralController {

  // Add this method to your ReferralController class (referral.controller.ts)

public validateReferralCode = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { referralCode } = req.body;
    
    if (!referralCode) {
      return ResponseHandler.badRequest(res, 'Referral code is required');
    }
    
    const result = await referralService.validateReferralCode(referralCode);
    
    return ResponseHandler.success(res, 'Referral code validated', result);
  }
);
  public applyReferralCode = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { referralCode } = req.body;
      
      const referral = await referralService.applyReferralCode(userId, referralCode);
      
      return ResponseHandler.created(res, 'Referral code applied successfully', { referral });
    }
  );

  public getReferralStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const stats = await referralService.getReferralStats(userId);
      
      return ResponseHandler.success(res, 'Referral stats retrieved', { stats });
    }
  );

  public getUserReferrals = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as string,
      };
      
      const result = await referralService.getUserReferrals(userId, filters, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Referrals retrieved',
        result.referrals,
        page,
        limit,
        result.total
      );
    }
  );

  public getReferralById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { referralId } = req.params;
      const userId = req.user!.id;
      
      const referral = await referralService.getReferralById(referralId, userId);
      
      return ResponseHandler.success(res, 'Referral retrieved', { referral });
    }
  );

  public getLeaderboard = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const leaderboard = await referralService.getLeaderboard(limit);
      
      return ResponseHandler.success(res, 'Leaderboard retrieved', { leaderboard });
    }
  );

  // Admin endpoints
  public getAllReferrals = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await referralService.getAllReferrals(filters, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Referrals retrieved',
        result.referrals,
        page,
        limit,
        result.total
      );
    }
  );

  public getAdminStats = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const stats = await referralService.getAdminStats();
      
      return ResponseHandler.success(res, 'Referral statistics retrieved', { stats });
    }
  );
}

export default new ReferralController();
