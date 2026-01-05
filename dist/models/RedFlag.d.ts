import mongoose, { Document } from 'mongoose';
export declare enum RedFlagType {
    VENDOR_LATE_CANCELLATION = "vendor_late_cancellation",
    CLIENT_FREQUENT_CANCELLATION = "client_frequent_cancellation",
    SUSPECTED_OFF_PLATFORM_MEETING = "suspected_off_platform_meeting",
    LOCATION_PROXIMITY_NO_BOOKING = "location_proximity_no_booking",
    CHAT_CONTAINS_CONTACT_INFO = "chat_contains_contact_info",
    CHAT_SUGGESTS_OUTSIDE_PAYMENT = "chat_suggests_outside_payment",
    FREQUENT_REFUND_REQUESTS = "frequent_refund_requests",
    SUSPICIOUS_PAYMENT_PATTERN = "suspicious_payment_pattern",
    CHARGEBACK_ATTEMPT = "chargeback_attempt",
    MULTIPLE_ACCOUNTS_SAME_DEVICE = "multiple_accounts_same_device",
    FAKE_REVIEWS_DETECTED = "fake_reviews_detected",
    IDENTITY_MISMATCH = "identity_mismatch",
    SERVICE_QUALITY_COMPLAINTS = "service_quality_complaints",
    NO_SHOW_VENDOR = "no_show_vendor",
    NO_SHOW_CLIENT = "no_show_client",
    HARASSMENT_REPORTED = "harassment_reported",
    INAPPROPRIATE_BEHAVIOR = "inappropriate_behavior",
    SAFETY_CONCERN = "safety_concern",
    CUSTOM = "custom"
}
export declare enum RedFlagSeverity {
    LOW = "low",// Informational, no immediate action
    MEDIUM = "medium",// Requires review within 48 hours
    HIGH = "high",// Requires review within 24 hours
    CRITICAL = "critical"
}
export declare enum RedFlagStatus {
    OPEN = "open",
    UNDER_REVIEW = "under_review",
    RESOLVED = "resolved",
    DISMISSED = "dismissed",
    ESCALATED = "escalated",
    ACTION_TAKEN = "action_taken"
}
export interface IRedFlag extends Document {
    type: RedFlagType;
    severity: RedFlagSeverity;
    status: RedFlagStatus;
    flaggedUser: mongoose.Types.ObjectId;
    flaggedUserRole: 'client' | 'vendor';
    relatedUser?: mongoose.Types.ObjectId;
    relatedUserRole?: 'client' | 'vendor';
    triggerSource: 'system_auto' | 'user_report' | 'admin_manual' | 'ai_detection';
    reportedBy?: mongoose.Types.ObjectId;
    booking?: mongoose.Types.ObjectId;
    payment?: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    chat?: mongoose.Types.ObjectId;
    review?: mongoose.Types.ObjectId;
    title: string;
    description: string;
    evidence: {
        type: 'location' | 'chat_message' | 'transaction' | 'screenshot' | 'log' | 'other';
        data: any;
        timestamp: Date;
    }[];
    locationData?: {
        flaggedUserLocation?: {
            type: string;
            coordinates: [number, number];
            address?: string;
            capturedAt: Date;
        };
        relatedUserLocation?: {
            type: string;
            coordinates: [number, number];
            address?: string;
            capturedAt: Date;
        };
        distanceMeters?: number;
        proximityDuration?: number;
    };
    chatAnalysis?: {
        suspiciousMessages: {
            messageId: string;
            content: string;
            detectedPatterns: string[];
            confidence: number;
            timestamp: Date;
        }[];
        overallRiskScore: number;
    };
    metrics?: {
        occurrenceCount?: number;
        timeframeDays?: number;
        previousFlagsCount?: number;
        financialImpact?: number;
    };
    resolution?: {
        action: 'warning_issued' | 'temporary_suspension' | 'permanent_ban' | 'fine_applied' | 'no_action' | 'escalated';
        actionDetails?: string;
        resolvedBy: mongoose.Types.ObjectId;
        resolvedAt: Date;
        notes?: string;
    };
    adminNotes: {
        note: string;
        addedBy: mongoose.Types.ObjectId;
        addedAt: Date;
    }[];
    assignedTo?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}
declare const _default: mongoose.Model<IRedFlag, {}, {}, {}, mongoose.Document<unknown, {}, IRedFlag, {}, {}> & IRedFlag & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=RedFlag.d.ts.map