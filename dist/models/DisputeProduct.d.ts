import mongoose, { Document, Model } from 'mongoose';
export declare enum DisputeStatus {
    OPEN = "open",
    UNDER_REVIEW = "under_review",
    AWAITING_RESPONSE = "awaiting_response",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare enum DisputeReason {
    PRODUCT_NOT_RECEIVED = "product_not_received",
    PRODUCT_DAMAGED = "product_damaged",
    WRONG_PRODUCT = "wrong_product",
    PRODUCT_NOT_AS_DESCRIBED = "product_not_as_described",
    QUALITY_ISSUE = "quality_issue",
    DELIVERY_ISSUE = "delivery_issue",
    PAYMENT_ISSUE = "payment_issue",
    OTHER = "other"
}
export declare enum DisputeResolution {
    FULL_REFUND = "full_refund",
    PARTIAL_REFUND = "partial_refund",
    REPLACEMENT = "replacement",
    SELLER_WINS = "seller_wins",
    CUSTOMER_WINS = "customer_wins"
}
export interface IDisputeMessage {
    sender: mongoose.Types.ObjectId;
    senderRole: 'customer' | 'seller' | 'admin';
    message: string;
    attachments?: string[];
    createdAt: Date;
}
export interface IDispute extends Document {
    _id: mongoose.Types.ObjectId;
    disputeNumber: string;
    order: mongoose.Types.ObjectId;
    product?: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    reason: DisputeReason;
    description: string;
    evidence?: string[];
    status: DisputeStatus;
    priority: 'low' | 'medium' | 'high';
    assignedTo?: mongoose.Types.ObjectId;
    assignedAt?: Date;
    messages: IDisputeMessage[];
    lastMessageAt?: Date;
    resolution?: DisputeResolution;
    resolutionNote?: string;
    refundAmount?: number;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedAt?: Date;
    closedBy?: mongoose.Types.ObjectId;
    closedAt?: Date;
    closureNote?: string;
    customerResponded: boolean;
    sellerResponded: boolean;
    lastResponseAt?: Date;
    isEscalated: boolean;
    escalatedAt?: Date;
    escalatedReason?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    addMessage(senderId: string, senderRole: string, message: string, attachments?: string[]): Promise<void>;
    canBeResolved(): boolean;
    canBeClosed(): boolean;
}
declare const Dispute: Model<IDispute>;
export default Dispute;
//# sourceMappingURL=DisputeProduct.d.ts.map