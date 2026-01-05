import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import disputeService from '../services/dispute.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class DisputeController {
  /**
   * Create dispute
   */
  public createDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      
      const dispute = await disputeService.createDispute(userId, req.body);
      
      return ResponseHandler.created(res, 'Dispute created successfully', { dispute });
    }
  );

  /**
   * Add evidence to dispute
   */
  public addEvidence = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const userId = req.user!.id;
      const { evidence } = req.body;
      
      const dispute = await disputeService.addEvidence(disputeId, userId, evidence);
      
      return ResponseHandler.success(res, 'Evidence added successfully', { dispute });
    }
  );

  /**
   * Add message to dispute
   */
  public addMessage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const userId = req.user!.id;
      const { message, attachments } = req.body;
      
      const dispute = await disputeService.addMessage(disputeId, userId, message, attachments);
      
      return ResponseHandler.success(res, 'Message sent successfully', { dispute });
    }
  );

  /**
   * Get dispute by ID
   */
  public getDisputeById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const userId = req.user!.id;
      
      const dispute = await disputeService.getDisputeById(disputeId, userId);
      
      return ResponseHandler.success(res, 'Dispute retrieved successfully', { dispute });
    }
  );

  /**
   * Get user disputes
   */
  public getUserDisputes = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        status: req.query.status as any,
        category: req.query.category as string,
      };
      
      const result = await disputeService.getUserDisputes(userId, filters, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Disputes retrieved successfully',
        result.disputes,
        page,
        limit,
        result.total
      );
    }
  );

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all disputes (Admin)
   */
  public getAllDisputes = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as any,
        category: req.query.category as string,
        priority: req.query.priority as string,
        assignedTo: req.query.assignedTo as string,
      };
      
      const result = await disputeService.getAllDisputes(filters, page, limit);
      
      return ResponseHandler.paginated(
        res,
        'Disputes retrieved successfully',
        result.disputes,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Assign dispute (Admin)
   */
  public assignDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const adminId = req.user!.id;
      const { assignToId } = req.body;
      
      const dispute = await disputeService.assignDispute(disputeId, adminId, assignToId);
      
      return ResponseHandler.success(res, 'Dispute assigned successfully', { dispute });
    }
  );

  /**
   * Update dispute priority (Admin)
   */
  public updatePriority = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const { priority } = req.body;
      
      const dispute = await disputeService.updatePriority(disputeId, priority);
      
      return ResponseHandler.success(res, 'Priority updated successfully', { dispute });
    }
  );

  /**
   * Resolve dispute (Admin)
   */
  public resolveDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const adminId = req.user!.id;
      
      const dispute = await disputeService.resolveDispute(disputeId, adminId, req.body);
      
      return ResponseHandler.success(res, 'Dispute resolved successfully', { dispute });
    }
  );

  /**
   * Close dispute (Admin)
   */
  public closeDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const adminId = req.user!.id;
      
      const dispute = await disputeService.closeDispute(disputeId, adminId);
      
      return ResponseHandler.success(res, 'Dispute closed successfully', { dispute });
    }
  );

  /**
   * Get dispute statistics (Admin)
   */
  public getDisputeStats = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const stats = await disputeService.getDisputeStats();
      
      return ResponseHandler.success(res, 'Statistics retrieved successfully', { stats });
    }
  );
}

export default new DisputeController();
