import mongoose, { Schema, Document } from 'mongoose';

// ==================== RED FLAG TYPES ====================
export enum RedFlagType {
  // Cancellation Related
  VENDOR_LATE_CANCELLATION = 'vendor_late_cancellation',
  CLIENT_FREQUENT_CANCELLATION = 'client_frequent_cancellation',
  
  // Off-Platform Activity Detection
  SUSPECTED_OFF_PLATFORM_MEETING = 'suspected_off_platform_meeting',
  LOCATION_PROXIMITY_NO_BOOKING = 'location_proximity_no_booking',
  CHAT_CONTAINS_CONTACT_INFO = 'chat_contains_contact_info',
  CHAT_SUGGESTS_OUTSIDE_PAYMENT = 'chat_suggests_outside_payment',
  
  // Payment Related
  FREQUENT_REFUND_REQUESTS = 'frequent_refund_requests',
  SUSPICIOUS_PAYMENT_PATTERN = 'suspicious_payment_pattern',
  CHARGEBACK_ATTEMPT = 'chargeback_attempt',
  
  // Account Related
  MULTIPLE_ACCOUNTS_SAME_DEVICE = 'multiple_accounts_same_device',
  FAKE_REVIEWS_DETECTED = 'fake_reviews_detected',
  IDENTITY_MISMATCH = 'identity_mismatch',
  
  // Service Related
  SERVICE_QUALITY_COMPLAINTS = 'service_quality_complaints',
  NO_SHOW_VENDOR = 'no_show_vendor',
  NO_SHOW_CLIENT = 'no_show_client',
  
  // Safety Related
  HARASSMENT_REPORTED = 'harassment_reported',
  INAPPROPRIATE_BEHAVIOR = 'inappropriate_behavior',
  SAFETY_CONCERN = 'safety_concern',
  
  // Other
  CUSTOM = 'custom',
}

export enum RedFlagSeverity {
  LOW = 'low',           // Informational, no immediate action
  MEDIUM = 'medium',     // Requires review within 48 hours
  HIGH = 'high',         // Requires review within 24 hours
  CRITICAL = 'critical', // Immediate action required
}

export enum RedFlagStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated',
  ACTION_TAKEN = 'action_taken',
}

export interface IRedFlag extends Document {
  // Core identification
  type: RedFlagType;
  severity: RedFlagSeverity;
  status: RedFlagStatus;
  
  // Who is involved
  flaggedUser: mongoose.Types.ObjectId;    // Primary user being flagged
  flaggedUserRole: 'client' | 'vendor';
  relatedUser?: mongoose.Types.ObjectId;   // Secondary user (if applicable)
  relatedUserRole?: 'client' | 'vendor';
  
  // What triggered the flag
  triggerSource: 'system_auto' | 'user_report' | 'admin_manual' | 'ai_detection';
  reportedBy?: mongoose.Types.ObjectId;    // If user reported
  
  // Related entities
  booking?: mongoose.Types.ObjectId;
  payment?: mongoose.Types.ObjectId;
  service?: mongoose.Types.ObjectId;
  chat?: mongoose.Types.ObjectId;
  review?: mongoose.Types.ObjectId;
  
  // Details
  title: string;
  description: string;
  evidence: {
    type: 'location' | 'chat_message' | 'transaction' | 'screenshot' | 'log' | 'other';
    data: any;
    timestamp: Date;
  }[];
  
  // Location data (for proximity detection)
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
    proximityDuration?: number; // How long they were close (minutes)
  };
  
  // Chat analysis (for contact sharing detection)
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
  
  // Metrics for pattern detection
  metrics?: {
    occurrenceCount?: number;        // How many times this happened
    timeframeDays?: number;          // Over what period
    previousFlagsCount?: number;     // User's previous flags
    financialImpact?: number;        // Estimated ₦ impact
  };
  
  // Resolution
  resolution?: {
    action: 'warning_issued' | 'temporary_suspension' | 'permanent_ban' | 'fine_applied' | 'no_action' | 'escalated';
    actionDetails?: string;
    resolvedBy: mongoose.Types.ObjectId;
    resolvedAt: Date;
    notes?: string;
  };
  
  // Admin notes & tracking
  adminNotes: {
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }[];
  
  assignedTo?: mongoose.Types.ObjectId;  // Admin assigned to review
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;  // Auto-expire old flags
}

const RedFlagSchema = new Schema<IRedFlag>(
  {
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
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    review: {
      type: Schema.Types.ObjectId,
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
      data: Schema.Types.Mixed,
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
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: Date,
      notes: String,
    },
    
    adminNotes: [{
      note: String,
      addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      addedAt: { type: Date, default: Date.now },
    }],
    
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
RedFlagSchema.index({ flaggedUser: 1, type: 1 });
RedFlagSchema.index({ status: 1, severity: 1 });
RedFlagSchema.index({ createdAt: -1 });
RedFlagSchema.index({ 'locationData.flaggedUserLocation.coordinates': '2dsphere' });
RedFlagSchema.index({ 'locationData.relatedUserLocation.coordinates': '2dsphere' });

// TTL index for auto-expiring old resolved flags (optional)
RedFlagSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRedFlag>('RedFlag', RedFlagSchema);