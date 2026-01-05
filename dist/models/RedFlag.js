"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedFlagStatus = exports.RedFlagSeverity = exports.RedFlagType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ==================== RED FLAG TYPES ====================
var RedFlagType;
(function (RedFlagType) {
    // Cancellation Related
    RedFlagType["VENDOR_LATE_CANCELLATION"] = "vendor_late_cancellation";
    RedFlagType["CLIENT_FREQUENT_CANCELLATION"] = "client_frequent_cancellation";
    // Off-Platform Activity Detection
    RedFlagType["SUSPECTED_OFF_PLATFORM_MEETING"] = "suspected_off_platform_meeting";
    RedFlagType["LOCATION_PROXIMITY_NO_BOOKING"] = "location_proximity_no_booking";
    RedFlagType["CHAT_CONTAINS_CONTACT_INFO"] = "chat_contains_contact_info";
    RedFlagType["CHAT_SUGGESTS_OUTSIDE_PAYMENT"] = "chat_suggests_outside_payment";
    // Payment Related
    RedFlagType["FREQUENT_REFUND_REQUESTS"] = "frequent_refund_requests";
    RedFlagType["SUSPICIOUS_PAYMENT_PATTERN"] = "suspicious_payment_pattern";
    RedFlagType["CHARGEBACK_ATTEMPT"] = "chargeback_attempt";
    // Account Related
    RedFlagType["MULTIPLE_ACCOUNTS_SAME_DEVICE"] = "multiple_accounts_same_device";
    RedFlagType["FAKE_REVIEWS_DETECTED"] = "fake_reviews_detected";
    RedFlagType["IDENTITY_MISMATCH"] = "identity_mismatch";
    // Service Related
    RedFlagType["SERVICE_QUALITY_COMPLAINTS"] = "service_quality_complaints";
    RedFlagType["NO_SHOW_VENDOR"] = "no_show_vendor";
    RedFlagType["NO_SHOW_CLIENT"] = "no_show_client";
    // Safety Related
    RedFlagType["HARASSMENT_REPORTED"] = "harassment_reported";
    RedFlagType["INAPPROPRIATE_BEHAVIOR"] = "inappropriate_behavior";
    RedFlagType["SAFETY_CONCERN"] = "safety_concern";
    // Other
    RedFlagType["CUSTOM"] = "custom";
})(RedFlagType || (exports.RedFlagType = RedFlagType = {}));
var RedFlagSeverity;
(function (RedFlagSeverity) {
    RedFlagSeverity["LOW"] = "low";
    RedFlagSeverity["MEDIUM"] = "medium";
    RedFlagSeverity["HIGH"] = "high";
    RedFlagSeverity["CRITICAL"] = "critical";
})(RedFlagSeverity || (exports.RedFlagSeverity = RedFlagSeverity = {}));
var RedFlagStatus;
(function (RedFlagStatus) {
    RedFlagStatus["OPEN"] = "open";
    RedFlagStatus["UNDER_REVIEW"] = "under_review";
    RedFlagStatus["RESOLVED"] = "resolved";
    RedFlagStatus["DISMISSED"] = "dismissed";
    RedFlagStatus["ESCALATED"] = "escalated";
    RedFlagStatus["ACTION_TAKEN"] = "action_taken";
})(RedFlagStatus || (exports.RedFlagStatus = RedFlagStatus = {}));
const RedFlagSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: Object.values(RedFlagType),
        required: true,
        index: true,
    },
    severity: {
        type: String,
        enum: Object.values(RedFlagSeverity),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(RedFlagStatus),
        default: RedFlagStatus.OPEN,
        index: true,
    },
    flaggedUser: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    flaggedUserRole: {
        type: String,
        enum: ['client', 'vendor'],
        required: true,
    },
    relatedUser: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    relatedUserRole: {
        type: String,
        enum: ['client', 'vendor'],
    },
    triggerSource: {
        type: String,
        enum: ['system_auto', 'user_report', 'admin_manual', 'ai_detection'],
        required: true,
    },
    reportedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
    },
    payment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Payment',
    },
    service: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Service',
    },
    chat: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
    },
    review: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Review',
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    evidence: [{
            type: {
                type: String,
                enum: ['location', 'chat_message', 'transaction', 'screenshot', 'log', 'other'],
            },
            data: mongoose_1.Schema.Types.Mixed,
            timestamp: Date,
        }],
    locationData: {
        flaggedUserLocation: {
            type: { type: String, default: 'Point' },
            coordinates: [Number],
            address: String,
            capturedAt: Date,
        },
        relatedUserLocation: {
            type: { type: String, default: 'Point' },
            coordinates: [Number],
            address: String,
            capturedAt: Date,
        },
        distanceMeters: Number,
        proximityDuration: Number,
    },
    chatAnalysis: {
        suspiciousMessages: [{
                messageId: String,
                content: String,
                detectedPatterns: [String],
                confidence: Number,
                timestamp: Date,
            }],
        overallRiskScore: Number,
    },
    metrics: {
        occurrenceCount: Number,
        timeframeDays: Number,
        previousFlagsCount: Number,
        financialImpact: Number,
    },
    resolution: {
        action: {
            type: String,
            enum: ['warning_issued', 'temporary_suspension', 'permanent_ban', 'fine_applied', 'no_action', 'escalated'],
        },
        actionDetails: String,
        resolvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: Date,
        notes: String,
    },
    adminNotes: [{
            note: String,
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
            addedAt: { type: Date, default: Date.now },
        }],
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    expiresAt: Date,
}, {
    timestamps: true,
});
// Indexes for efficient querying
RedFlagSchema.index({ flaggedUser: 1, type: 1 });
RedFlagSchema.index({ status: 1, severity: 1 });
RedFlagSchema.index({ createdAt: -1 });
RedFlagSchema.index({ 'locationData.flaggedUserLocation.coordinates': '2dsphere' });
RedFlagSchema.index({ 'locationData.relatedUserLocation.coordinates': '2dsphere' });
// TTL index for auto-expiring old resolved flags (optional)
RedFlagSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
exports.default = mongoose_1.default.model('RedFlag', RedFlagSchema);
//# sourceMappingURL=RedFlag.js.map