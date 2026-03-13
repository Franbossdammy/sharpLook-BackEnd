import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import auditLogService from '../services/auditLog.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class AuditLogController {
  /**
   * Get all audit logs (Admin)
   * GET /api/v1/audit-logs
   */
  public getAll = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        action: req.query.action as string,
        resource: req.query.resource as string,
        actor: req.query.actor as string,
        role: req.query.role as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        search: req.query.search as string,
      };

      const result = await auditLogService.getAll(page, limit, filters);

      return ResponseHandler.paginated(
        res,
        'Audit logs retrieved successfully',
        result.logs as any[],
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get audit logs for a specific resource
   * GET /api/v1/audit-logs/:resource/:resourceId
   */
  public getByResource = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { resource, resourceId } = req.params;

      const logs = await auditLogService.getByResource(resource, resourceId);

      return ResponseHandler.success(res, 'Audit logs retrieved successfully', { logs });
    }
  );
}

export default new AuditLogController();
