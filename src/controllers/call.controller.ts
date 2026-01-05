import { Response, NextFunction } from 'express';
import callService from '../services/call.service';
import ResponseHandler from '../utils/response';
import { AuthRequest } from '../types/message.types';

class CallController {
  /**
   * Get call history
   */
  public async getCallHistory(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await callService.getCallHistory(userId, page, limit);

      ResponseHandler.paginated(
        res,
        'Call history retrieved successfully',
        result.calls,
        result.page,
        limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get call by ID
   */
  public async getCall(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { callId } = req.params;

      const call = await callService.getCallById(callId);

      // Verify user is participant
      if (
        call.caller.toString() !== userId &&
        call.receiver.toString() !== userId
      ) {
        ResponseHandler.forbidden(res, 'Unauthorized to view this call');
        return;
      }

      ResponseHandler.success(res, 'Call retrieved successfully', call);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active call
   */
  public async getActiveCall(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const call = await callService.getActiveCall(userId);

      ResponseHandler.success(
        res,
        call ? 'Active call found' : 'No active call',
        { call }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete call from history
   */
  public async deleteCall(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { callId } = req.params;

      await callService.deleteCall(callId, userId);

      ResponseHandler.success(res, 'Call deleted successfully', null);
    } catch (error) {
      next(error);
    }
  }
}

export default new CallController();