import mongoose, { Document, Model } from 'mongoose';
import { DisputeStatus, DisputeResolution } from '../types';
export interface IDispute extends Document {
    _id: mongoose.Types.ObjectId;
    booking: mongoose.Types.ObjectId;
    raisedBy: mongoose.Types.ObjectId;
    against: mongoose.Types.ObjectId;
    reason: string;
    description: string;
    category: 'service_quality' | 'payment' | 'cancellation' | 'communication' | 'other';
    evidence: {
        type: 'text' | 'image' | 'document';
        content: string;
        uploadedAt: Date;
        uploadedBy: mongoose.Types.ObjectId;
    }[];
    status: DisputeStatus;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewNotes?: string;
    resolution?: DisputeResolution;
    resolutionDetails?: string;
    resolvedAt?: Date;
    resolvedBy?: mongoose.Types.ObjectId;
    refundAmount?: number;
    vendorPaymentAmount?: number;
    messages: {
        sender: mongoose.Types.ObjectId;
        message: string;
        attachments?: string[];
        sentAt: Date;
    }[];
    closedAt?: Date;
    closedBy?: mongoose.Types.ObjectId;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Dispute: Model<IDispute>;
export default Dispute;
//# sourceMappingURL=Dispute.d.ts.map