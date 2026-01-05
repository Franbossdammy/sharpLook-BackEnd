import { ICall } from '../models/Call';
declare class CallService {
    /**
     * Create a new call record
     */
    createCall(callerId: string, receiverId: string, type: 'voice' | 'video'): Promise<ICall>;
    /**
     * Update call status
     */
    updateCallStatus(callId: string, status: ICall['status']): Promise<ICall>;
    /**
     * Get call by ID
     */
    getCallById(callId: string): Promise<ICall>;
    /**
     * Get call history for a user
     */
    getCallHistory(userId: string, page?: number, limit?: number): Promise<{
        calls: ICall[];
        total: number;
        page: number;
    }>;
    /**
     * Get active call for user
     */
    getActiveCall(userId: string): Promise<ICall | null>;
    /**
     * End call
     */
    endCall(callId: string): Promise<ICall>;
    /**
     * Reject call
     */
    rejectCall(callId: string): Promise<ICall>;
    /**
     * Mark call as missed
     */
    markCallAsMissed(callId: string): Promise<ICall>;
    /**
     * Cancel call
     */
    cancelCall(callId: string): Promise<ICall>;
    /**
     * Delete call from history
     */
    deleteCall(callId: string, userId: string): Promise<void>;
}
declare const _default: CallService;
export default _default;
//# sourceMappingURL=call.service.d.ts.map