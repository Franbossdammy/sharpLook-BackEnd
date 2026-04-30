import { IRedFlag, RedFlagType, RedFlagSeverity, RedFlagStatus } from '../models/RedFlag';
declare class RedFlagService {
    /**
     * Create a red flag record
     */
    createRedFlag(data: {
        type: RedFlagType;
        severity: RedFlagSeverity;
        flaggedUserId: string;
        flaggedUserRole: 'client' | 'vendor';
        relatedUserId?: string;
        relatedUserRole?: 'client' | 'vendor';
        triggerSource: 'system_auto' | 'user_report' | 'admin_manual' | 'ai_detection';
        reportedBy?: string;
        bookingId?: string;
        paymentId?: string;
        serviceId?: string;
        chatId?: string;
        title: string;
        description: string;
        evidence?: any[];
        locationData?: any;
        chatAnalysis?: any;
        metrics?: any;
    }): Promise<IRedFlag>;
    /**
     * Update user's red flag count in their profile
     */
    private updateUserRedFlagCount;
    /**
     * Notify admins about a high-severity red flag
     */
    private notifyAdminsOfRedFlag;
    /**
     * Detect vendor late cancellation
     */
    detectVendorLateCancellation(bookingId: string, vendorId: string, minutesBeforeAppointment: number, reason?: string): Promise<IRedFlag>;
    /**
     * Detect client frequent cancellations
     */
    detectClientFrequentCancellations(clientId: string): Promise<IRedFlag | null>;
    /**
     * Analyze chat messages for suspicious content (contact sharing, outside payment)
     */
    analyzeChatForSuspiciousContent(chatId: string, senderId: string, messageContent: string): Promise<{
        isSuspicious: boolean;
        patterns: string[];
        riskScore: number;
    }>;
    /**
     * Create red flag for suspicious chat message
     */
    private flagSuspiciousChatMessage;
    /**
     * Mask sensitive content for storage (partial masking)
     */
    private maskSensitiveContent;
    /**
     * Detect potential off-platform meeting via location proximity
     */
    detectLocationProximity(vendorId: string, clientId: string, vendorCoords: [number, number], // [longitude, latitude]
    clientCoords: [number, number], timestamp: Date): Promise<IRedFlag | null>;
    /**
     * Detect suspected off-platform meeting based on patterns
     * - Conversation history between vendor and client
     * - No bookings between them OR bookings always cancelled
     * - Suspicious messages detected
     */
    detectSuspectedOffPlatformMeeting(vendorId: string, clientId: string): Promise<IRedFlag | null>;
    /**
     * Get all red flags with filters
     */
    getRedFlags(filters?: {
        type?: RedFlagType;
        severity?: RedFlagSeverity;
        status?: RedFlagStatus;
        flaggedUserId?: string;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<{
        flags: IRedFlag[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get red flag by ID
     */
    getRedFlagById(flagId: string): Promise<IRedFlag>;
    /**
     * Update red flag status
     */
    updateRedFlagStatus(flagId: string, adminId: string, status: RedFlagStatus, note?: string): Promise<IRedFlag>;
    /**
     * Resolve red flag with action
     */
    resolveRedFlag(flagId: string, adminId: string, resolution: {
        action: 'warning_issued' | 'temporary_suspension' | 'permanent_ban' | 'fine_applied' | 'no_action' | 'escalated';
        actionDetails?: string;
        notes?: string;
    }): Promise<IRedFlag>;
    /**
     * Apply sanction to user account
     * NOTE: You'll need to add these fields to your User model
     */
    private applyUserSanction;
    /**
     * Assign red flag to admin
     */
    assignRedFlag(flagId: string, adminId: string): Promise<IRedFlag>;
    /**
     * Add admin note to red flag
     */
    addAdminNote(flagId: string, adminId: string, note: string): Promise<IRedFlag>;
    /**
     * Get red flag statistics
     */
    getRedFlagStats(): Promise<any>;
    /**
     * Get users with most red flags
     */
    getMostFlaggedUsers(limit?: number): Promise<any[]>;
    /**
     * Check location proximity for a single user against all online users of opposite role.
     * Call this fire-and-forget when a user pushes a location update.
     */
    checkProximityOnLocationUpdate(userId: string, userCoords: [number, number], isVendor: boolean, timestamp: Date): Promise<void>;
    /**
     * Sweep all currently-online vendor–client pairs for proximity.
     * Run from cron every 5 minutes.
     */
    runProximitySweep(): Promise<void>;
    /**
     * Detect vendor–client pairs that had repeat bookings but went silent.
     * Run from cron daily.
     */
    runDropoutDetection(silentDays?: number, minBookings?: number): Promise<void>;
}
declare const _default: RedFlagService;
export default _default;
//# sourceMappingURL=redFlag.service.d.ts.map