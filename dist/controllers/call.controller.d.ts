import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/message.types';
declare class CallController {
    /**
     * Get call history
     */
    getCallHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get call by ID
     */
    getCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get active call
     */
    getActiveCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Delete call from history
     */
    deleteCall(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: CallController;
export default _default;
//# sourceMappingURL=call.controller.d.ts.map