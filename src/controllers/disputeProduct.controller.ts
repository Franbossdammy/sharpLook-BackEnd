import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import disputeService from '../services/DisputeProduct.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { DisputeStatus, DisputeReason, DisputeResolution } from '../models/DisputeProduct';
import { uploadToCloudinary } from '../utils/cloudinary';
import { BadRequestError } from '../utils/errors';

class DisputeController {
  /**
   * Create a new dispute
   * POST /api/v1/disputes
   */
  public createDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      // Handle evidence uploads
      const files = req.files as Express.Multer.File[];
      const evidenceUrls: string[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          const evidenceUrl = await uploadToCloudinary(file.buffer, {
            folder: 'sharplook/disputes',
            transformation: [
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });
          evidenceUrls.push(evidenceUrl);
        }
      }

      const disputeData = {
        ...req.body,
        evidence: evidenceUrls,
      };

      const dispute = await disputeService.createDispute(userId, disputeData);

      return ResponseHandler.success(
        res,
        'Dispute created successfully. An admin will review your case.',
        {
          dispute,
        },
        201
      );
    }
  );

  /**
   * Get dispute by ID
   * GET /api/v1/disputes/:disputeId
   */
  public getDisputeById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const userId = req.user!.id;

      const dispute = await disputeService.getDisputeById(disputeId, userId);

      return ResponseHandler.success(res, 'Dispute retrieved successfully', {
        dispute,
      });
    }
  );

  /**
   * Get user's disputes (customer or seller)
   * GET /api/v1/disputes/my-disputes
   */
  public getUserDisputes = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const role = (req.query.role as 'customer' | 'seller') || 'customer';
      const status = req.query.status as DisputeStatus;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await disputeService.getUserDisputes(userId, role, status, page, limit);

      return ResponseHandler.paginated(
        res,
        'Your disputes retrieved successfully',
        result.disputes,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get all disputes (admin)
   * GET /api/v1/disputes
   */
  public getAllDisputes = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: any = {
        status: req.query.status as DisputeStatus,
        priority: req.query.priority as 'low' | 'medium' | 'high',
        assignedTo: req.query.assignedTo as string,
        reason: req.query.reason as DisputeReason,
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

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
   * Add message to dispute
   * POST /api/v1/disputes/:disputeId/messages
   */
  public addMessage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const senderId = req.user!.id;
      const { message } = req.body;

      // Handle attachment uploads
      const files = req.files as Express.Multer.File[];
      const attachmentUrls: string[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          const attachmentUrl = await uploadToCloudinary(file.buffer, {
            folder: 'sharplook/disputes/messages',
            transformation: [
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });
          attachmentUrls.push(attachmentUrl);
        }
      }

      const dispute = await disputeService.addMessage(
        disputeId,
        senderId,
        message,
        attachmentUrls.length > 0 ? attachmentUrls : undefined
      );

      return ResponseHandler.success(res, 'Message added successfully', {
        dispute,
      });
    }
  );

  /**
   * Assign dispute to admin
   * POST /api/v1/disputes/:disputeId/assign
   */
  public assignDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const { adminId } = req.body;

      // Use provided adminId or current admin
      const assignToAdminId = adminId || req.user!.id;

        const dispute = await disputeService.assignDispute(disputeId, assignToAdminId);
      return ResponseHandler.success(res, 'Dispute assigned successfully', {
        dispute,
      });
    }
  );

  /**
   * Resolve dispute (admin)
   * POST /api/v1/disputes/:disputeId/resolve
   */
  public resolveDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const adminId = req.user!.id;
      const { resolution, resolutionNote, refundAmount } = req.body;

      // Validate refundAmount for partial refund
      if (resolution === DisputeResolution.PARTIAL_REFUND && !refundAmount) {
        throw new BadRequestError('Refund amount is required for partial refund');
      }

      const dispute = await disputeService.resolveDispute(
        disputeId,
        adminId,
        resolution,
        resolutionNote,
        refundAmount
      );

      return ResponseHandler.success(res, 'Dispute resolved successfully', {
        dispute,
      });
    }
  );

  /**
   * Close dispute (admin)
   * POST /api/v1/disputes/:disputeId/close
   */
  public closeDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const adminId = req.user!.id;
      const { closureNote } = req.body;

      const dispute = await disputeService.closeDispute(disputeId, adminId, closureNote);

      return ResponseHandler.success(res, 'Dispute closed successfully', {
        dispute,
      });
    }
  );

  /**
   * Escalate dispute
   * POST /api/v1/disputes/:disputeId/escalate
   */
  public escalateDispute = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { disputeId } = req.params;
      const { reason } = req.body;

      const dispute = await disputeService.escalateDispute(disputeId, reason);

      return ResponseHandler.success(res, 'Dispute escalated successfully', {
        dispute,
      });
    }
  );

  /**
   * Get dispute statistics (admin)
   * GET /api/v1/disputes/stats
   */
  public getDisputeStats = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const stats = await disputeService.getDisputeStats();

      return ResponseHandler.success(res, 'Dispute statistics retrieved successfully', {
        stats,
      });
    }
  );

  /**
   * Get open disputes (admin dashboard)
   * GET /api/v1/disputes/open
   */
  public getOpenDisputes = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await disputeService.getAllDisputes(
        { status: DisputeStatus.OPEN },
        page,
        limit
      );

      return ResponseHandler.paginated(
        res,
        'Open disputes retrieved successfully',
        result.disputes,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get high priority disputes (admin dashboard)
   * GET /api/v1/disputes/high-priority
   */
  public getHighPriorityDisputes = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await disputeService.getAllDisputes(
        { priority: 'high' },
        page,
        limit
      );

      return ResponseHandler.paginated(
        res,
        'High priority disputes retrieved successfully',
        result.disputes,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get my assigned disputes (admin)
   * GET /api/v1/disputes/assigned-to-me
   */
  public getMyAssignedDisputes = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const adminId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await disputeService.getAllDisputes(
        { assignedTo: adminId },
        page,
        limit
      );

      return ResponseHandler.paginated(
        res,
        'Your assigned disputes retrieved successfully',
        result.disputes,
        page,
        limit,
        result.total
      );
    }
  );
}

export default new DisputeController();