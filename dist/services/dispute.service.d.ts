import { IDispute } from '../models/Dispute';
import { DisputeStatus, DisputeResolution } from '../types';
declare class DisputeService {
    /**
     * Create dispute
     */
    createDispute(userId: string, data: {
        bookingId: string;
        reason: string;
        description: string;
        category: string;
        evidence?: {
            type: string;
            content: string;
        }[];
    }): Promise<IDispute>;
    /**
     * Add evidence to dispute
     */
    addEvidence(disputeId: string, userId: string, evidence: {
        type: string;
        content: string;
    }[]): Promise<IDispute>;
    /**
     * Add message to dispute
     */
    addMessage(disputeId: string, userId: string, message: string, attachments?: string[]): Promise<IDispute>;
    /**
     * Assign dispute to admin (Admin)
     */
    assignDispute(disputeId: string, _adminId: string, assignToId: string): Promise<IDispute>;
    /**
     * Update dispute priority (Admin)
     */
    updatePriority(disputeId: string, priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<IDispute>;
    /**
     * Resolve dispute (Admin)
     */
    resolveDispute(disputeId: string, adminId: string, data: {
        resolution: DisputeResolution;
        resolutionDetails: string;
        refundAmount?: number;
        vendorPaymentAmount?: number;
    }): Promise<IDispute>;
    /**
     * Close dispute (Admin)
     */
    closeDispute(disputeId: string, adminId: string): Promise<IDispute>;
    /**
     * Get dispute by ID
     */
    getDisputeById(disputeId: string, userId: string): Promise<IDispute>;
    /**
     * Get user disputes
     */
    getUserDisputes(userId: string, filters?: {
        status?: DisputeStatus;
        category?: string;
    }, page?: number, limit?: number): Promise<{
        disputes: IDispute[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get all disputes (Admin)
     */
    getAllDisputes(filters?: {
        status?: DisputeStatus;
        category?: string;
        priority?: string;
        assignedTo?: string;
    }, page?: number, limit?: number): Promise<{
        disputes: IDispute[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get dispute statistics
     */
    getDisputeStats(): Promise<any>;
}
declare const _default: DisputeService;
export default _default;
//# sourceMappingURL=dispute.service.d.ts.map