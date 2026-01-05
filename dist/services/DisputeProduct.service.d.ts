import { IDispute, DisputeStatus, DisputeReason, DisputeResolution } from '../models/DisputeProduct';
declare class DisputeService {
    /**
     * Create a new dispute
     */
    createDispute(userId: string, disputeData: {
        order: string;
        product?: string;
        reason: DisputeReason;
        description: string;
        evidence?: string[];
    }): Promise<IDispute>;
    /**
     * Get dispute by ID
     */
    getDisputeById(disputeId: string, userId: string): Promise<IDispute>;
    /**
     * Get user disputes (customer or seller)
     */
    getUserDisputes(userId: string, role: 'customer' | 'seller', status?: DisputeStatus, page?: number, limit?: number): Promise<{
        disputes: IDispute[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get all disputes (admin)
     */
    getAllDisputes(filters?: {
        status?: DisputeStatus;
        priority?: 'low' | 'medium' | 'high';
        assignedTo?: string;
        reason?: DisputeReason;
    }, page?: number, limit?: number): Promise<{
        disputes: IDispute[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Add message to dispute
     */
    addMessage(disputeId: string, senderId: string, message: string, attachments?: string[]): Promise<IDispute>;
    /**
     * Assign dispute to admin
     */
    assignDispute(disputeId: string, assignToId: string): Promise<IDispute>;
    /**
     * Resolve dispute (admin only)
     */
    resolveDispute(disputeId: string, adminId: string, resolution: DisputeResolution, resolutionNote: string, refundAmount?: number): Promise<IDispute>;
    /**
     * Close dispute (admin only)
     */
    closeDispute(disputeId: string, adminId: string, closureNote: string): Promise<IDispute>;
    /**
     * Escalate dispute
     */
    escalateDispute(disputeId: string, escalatedReason: string): Promise<IDispute>;
    /**
     * Get dispute statistics (admin)
     */
    getDisputeStats(): Promise<any>;
}
declare const _default: DisputeService;
export default _default;
//# sourceMappingURL=DisputeProduct.service.d.ts.map