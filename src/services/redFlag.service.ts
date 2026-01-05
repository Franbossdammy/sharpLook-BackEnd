import RedFlag, { IRedFlag, RedFlagType, RedFlagSeverity, RedFlagStatus } from '../models/RedFlag';
import User from '../models/User';
import Booking from '../models/Booking';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { NotFoundError } from '../utils/errors';
import { calculateDistance, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';
import notificationHelper from '../utils/notificationHelper';

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely extract ObjectId string from a field that may be populated or just an ObjectId
 */
function extractId(field: any): string | undefined {
  if (!field) return undefined;
  
  // If it's already a string, return it
  if (typeof field === 'string') return field;
  
  // If it's an ObjectId, convert to string
  if (field._id) return field._id.toString();
  
  // If it has a toString method (ObjectId), use it
  if (typeof field.toString === 'function') {
    const str = field.toString();
    // Check if it's a valid ObjectId string (24 hex chars)
    if (/^[a-fA-F0-9]{24}$/.test(str)) return str;
  }
  
  return undefined;
}

// ==================== DETECTION THRESHOLDS ====================
const PROXIMITY_THRESHOLD_METERS = 100;          // 100m = likely same location
const PROXIMITY_DURATION_MINUTES = 15;           // Must be close for 15+ minutes
const CANCELLATION_COUNT_THRESHOLD = 3;          // 3 cancellations in timeframe
const CANCELLATION_TIMEFRAME_DAYS = 30;          // Within 30 days
const CHAT_RISK_SCORE_THRESHOLD = 0.7;           // 70% confidence for flagging
const LOCATION_CHECK_INTERVAL_MINUTES = 5;       // Check every 5 minutes

// Suspicious patterns in chat messages
const CONTACT_PATTERNS = [
  /\b\d{10,11}\b/,                               // Phone numbers (10-11 digits)
  /\b\d{4}[\s-]?\d{3}[\s-]?\d{4}\b/,            // Formatted phone numbers
  /\+\d{1,3}\s?\d{6,14}/,                        // International phone numbers
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
  /@[a-zA-Z0-9_]{3,}/,                           // Social media handles
  /wa\.me\/\d+/i,                                // WhatsApp links
  /instagram\.com\/[a-zA-Z0-9_.]+/i,             // Instagram profiles
  /facebook\.com\/[a-zA-Z0-9.]+/i,               // Facebook profiles
  /twitter\.com\/[a-zA-Z0-9_]+/i,                // Twitter profiles
  /t\.me\/[a-zA-Z0-9_]+/i,                       // Telegram links
];

const OUTSIDE_PAYMENT_PATTERNS = [
  /pay\s*(me\s*)?(outside|directly|cash|transfer)/i,
  /send\s*(money|payment)\s*(to\s*)?(my\s*)?(account|bank)/i,
  /bank\s*(account|details|transfer)/i,
  /account\s*number/i,
  /opay|palmpay|kuda|moniepoint/i,               // Nigerian fintech apps
  /\b(0\d{9})\b.*?(account|transfer|send)/i,    // Account number patterns
  /don'?t\s*(use|pay|book)\s*(through|on|via)\s*(the\s*)?(app|sharplook)/i,
  /meet\s*(up\s*)?(without|outside)\s*(booking|app)/i,
  /cash\s*(only|payment|on\s*delivery)/i,
  /no\s*need\s*(to\s*)?(book|pay)\s*(on|through|via)\s*(app)/i,
];

class RedFlagService {
  // ==================== CREATE RED FLAGS ====================

  /**
   * Create a red flag record
   */
  public async createRedFlag(data: {
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
  }): Promise<IRedFlag> {
    // Get previous flags count for this user
    const previousFlagsCount = await RedFlag.countDocuments({
      flaggedUser: data.flaggedUserId,
      status: { $nin: [RedFlagStatus.DISMISSED] },
    });

    // Auto-escalate severity if user has many previous flags
    let adjustedSeverity = data.severity;
    if (previousFlagsCount >= 5 && data.severity === RedFlagSeverity.LOW) {
      adjustedSeverity = RedFlagSeverity.MEDIUM;
    } else if (previousFlagsCount >= 10 && data.severity !== RedFlagSeverity.CRITICAL) {
      adjustedSeverity = RedFlagSeverity.HIGH;
    }

    const redFlag = await RedFlag.create({
      type: data.type,
      severity: adjustedSeverity,
      status: RedFlagStatus.OPEN,
      flaggedUser: data.flaggedUserId,
      flaggedUserRole: data.flaggedUserRole,
      relatedUser: data.relatedUserId,
      relatedUserRole: data.relatedUserRole,
      triggerSource: data.triggerSource,
      reportedBy: data.reportedBy,
      booking: data.bookingId,
      payment: data.paymentId,
      service: data.serviceId,
      chat: data.chatId,
      title: data.title,
      description: data.description,
      evidence: data.evidence || [],
      locationData: data.locationData,
      chatAnalysis: data.chatAnalysis,
      metrics: {
        ...data.metrics,
        previousFlagsCount,
      },
    });

    // Update user's red flag count
    await this.updateUserRedFlagCount(data.flaggedUserId, data.flaggedUserRole);

    // Notify admins for high/critical severity
    if ([RedFlagSeverity.HIGH, RedFlagSeverity.CRITICAL].includes(adjustedSeverity)) {
      await this.notifyAdminsOfRedFlag(redFlag);
    }

    logger.warn(`🚩 Red flag created: ${data.type} for user ${data.flaggedUserId} (severity: ${adjustedSeverity})`);

    return redFlag;
  }

  /**
   * Update user's red flag count in their profile
   */
  private async updateUserRedFlagCount(userId: string, role: 'client' | 'vendor'): Promise<void> {
    const openFlagsCount = await RedFlag.countDocuments({
      flaggedUser: userId,
      status: { $in: [RedFlagStatus.OPEN, RedFlagStatus.UNDER_REVIEW, RedFlagStatus.ESCALATED] },
    });

    const user = await User.findById(userId);
    if (user) {
      if (role === 'vendor' && user.vendorProfile) {
        user.vendorProfile.redFlagCount = openFlagsCount;
        user.vendorProfile.lastRedFlagAt = new Date();
      }
      await user.save();
    }
  }

  /**
   * Notify admins about a high-severity red flag
   */
  private async notifyAdminsOfRedFlag(redFlag: IRedFlag): Promise<void> {
    const flaggedUser = await User.findById(redFlag.flaggedUser);
    const userName = flaggedUser 
      ? `${flaggedUser.firstName} ${flaggedUser.lastName}` 
      : 'Unknown User';

    await notificationHelper.notifyAdmins(
      `🚩 ${redFlag.severity.toUpperCase()} Red Flag: ${redFlag.type}`,
      `${redFlag.title}\n\nUser: ${userName}\nRole: ${redFlag.flaggedUserRole}\n\n${redFlag.description}`,
      'system', // Use 'system' instead of 'red_flag' - this should be a valid enum value
      {
        redFlagId: (redFlag._id as any).toString(),
        type: redFlag.type,
        severity: redFlag.severity,
        flaggedUserId: redFlag.flaggedUser.toString(),
        isRedFlag: true, // Add this to identify it as a red flag notification
      }
    );
  }

  // ==================== DETECTION METHODS ====================

  /**
   * Detect vendor late cancellation
   */
  public async detectVendorLateCancellation(
    bookingId: string,
    vendorId: string,
    minutesBeforeAppointment: number,
    reason?: string
  ): Promise<IRedFlag> {
    const booking = await Booking.findById(bookingId).populate('service', 'name');
    const vendor = await User.findById(vendorId);
    const client = booking ? await User.findById(booking.client) : null;

    // Determine severity based on how late the cancellation is
    let severity = RedFlagSeverity.MEDIUM;
    if (minutesBeforeAppointment < 30) {
      severity = RedFlagSeverity.CRITICAL;
    } else if (minutesBeforeAppointment < 60) {
      severity = RedFlagSeverity.HIGH;
    }

    // Extract IDs properly using helper
    const serviceId = extractId(booking?.service);
    const clientId = extractId(booking?.client);

    // Extract service name safely
    const serviceName = booking?.service && typeof booking.service === 'object' 
      ? (booking.service as any).name 
      : 'Unknown Service';

    return this.createRedFlag({
      type: RedFlagType.VENDOR_LATE_CANCELLATION,
      severity,
      flaggedUserId: vendorId,
      flaggedUserRole: 'vendor',
      relatedUserId: clientId,
      relatedUserRole: 'client',
      triggerSource: 'system_auto',
      bookingId,
      serviceId,
      title: `Vendor cancelled ${minutesBeforeAppointment} minutes before appointment`,
      description: `Vendor "${vendor?.vendorProfile?.businessName || vendor?.firstName}" cancelled booking #${bookingId.slice(-8)} for service "${serviceName}" with only ${minutesBeforeAppointment} minutes notice. Client: ${client?.firstName} ${client?.lastName}. Reason: ${reason || 'Not provided'}`,
      evidence: [{
        type: 'log',
        data: {
          bookingId,
          scheduledDate: booking?.scheduledDate,
          scheduledTime: booking?.scheduledTime,
          cancelledAt: new Date(),
          minutesBeforeAppointment,
          reason,
        },
        timestamp: new Date(),
      }],
      metrics: {
        occurrenceCount: 1,
        financialImpact: booking?.totalAmount || 0,
      },
    });
  }

  /**
   * Detect client frequent cancellations
   */
  public async detectClientFrequentCancellations(clientId: string): Promise<IRedFlag | null> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - CANCELLATION_TIMEFRAME_DAYS);

    const cancellationCount = await Booking.countDocuments({
      client: clientId,
      status: 'cancelled',
      cancelledBy: clientId,
      cancelledAt: { $gte: thirtyDaysAgo },
    });

    if (cancellationCount >= CANCELLATION_COUNT_THRESHOLD) {
      // Check if we already flagged this recently
      const existingFlag = await RedFlag.findOne({
        flaggedUser: clientId,
        type: RedFlagType.CLIENT_FREQUENT_CANCELLATION,
        createdAt: { $gte: thirtyDaysAgo },
      });

      if (existingFlag) {
        // Update existing flag
        existingFlag.metrics = {
          ...existingFlag.metrics,
          occurrenceCount: cancellationCount,
        };
        await existingFlag.save();
        return existingFlag;
      }

      const client = await User.findById(clientId);

      return this.createRedFlag({
        type: RedFlagType.CLIENT_FREQUENT_CANCELLATION,
        severity: cancellationCount >= 5 ? RedFlagSeverity.HIGH : RedFlagSeverity.MEDIUM,
        flaggedUserId: clientId,
        flaggedUserRole: 'client',
        triggerSource: 'system_auto',
        title: `Client cancelled ${cancellationCount} bookings in ${CANCELLATION_TIMEFRAME_DAYS} days`,
        description: `Client "${client?.firstName} ${client?.lastName}" has cancelled ${cancellationCount} bookings in the last ${CANCELLATION_TIMEFRAME_DAYS} days. This pattern may indicate abuse of the booking system.`,
        metrics: {
          occurrenceCount: cancellationCount,
          timeframeDays: CANCELLATION_TIMEFRAME_DAYS,
        },
      });
    }

    return null;
  }

  /**
   * Analyze chat messages for suspicious content (contact sharing, outside payment)
   */
  public async analyzeChatForSuspiciousContent(
    chatId: string,
    senderId: string,
    messageContent: string
  ): Promise<{ isSuspicious: boolean; patterns: string[]; riskScore: number }> {
    const detectedPatterns: string[] = [];
    let riskScore = 0;

    // Check for contact information
    for (const pattern of CONTACT_PATTERNS) {
      if (pattern.test(messageContent)) {
        detectedPatterns.push('contact_info_shared');
        riskScore += 0.3;
        break; // One match is enough
      }
    }

    // Check for outside payment suggestions
    for (const pattern of OUTSIDE_PAYMENT_PATTERNS) {
      if (pattern.test(messageContent)) {
        detectedPatterns.push('outside_payment_suggested');
        riskScore += 0.5;
        break;
      }
    }

    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0);

    const isSuspicious = riskScore >= CHAT_RISK_SCORE_THRESHOLD;

    if (isSuspicious) {
      await this.flagSuspiciousChatMessage(chatId, senderId, messageContent, detectedPatterns, riskScore);
    }

    return { isSuspicious, patterns: detectedPatterns, riskScore };
  }

  /**
   * Create red flag for suspicious chat message
   */
  private async flagSuspiciousChatMessage(
    conversationId: string,
    senderId: string,
    messageContent: string,
    patterns: string[],
    riskScore: number
  ): Promise<IRedFlag> {
    // Get conversation to determine roles
    const conversation = await Conversation.findById(conversationId);
    const sender = await User.findById(senderId);
    
    // Determine the other party from participants array
    let otherUserId: string | undefined;
    
    if (conversation && conversation.participants.length === 2) {
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== senderId
      );
      otherUserId = otherParticipant?.toString();
    }

    // Determine sender role based on isVendor flag
    const senderRole: 'client' | 'vendor' = sender?.isVendor ? 'vendor' : 'client';
    
    // Determine other user's role
    let otherUserRole: 'client' | 'vendor' = 'client';
    if (otherUserId) {
      const otherUser = await User.findById(otherUserId);
      otherUserRole = otherUser?.isVendor ? 'vendor' : 'client';
    }

    const flagType = patterns.includes('outside_payment_suggested')
      ? RedFlagType.CHAT_SUGGESTS_OUTSIDE_PAYMENT
      : RedFlagType.CHAT_CONTAINS_CONTACT_INFO;

    return this.createRedFlag({
      type: flagType,
      severity: riskScore >= 0.8 ? RedFlagSeverity.HIGH : RedFlagSeverity.MEDIUM,
      flaggedUserId: senderId,
      flaggedUserRole: senderRole,
      relatedUserId: otherUserId,
      relatedUserRole: otherUserRole,
      triggerSource: 'ai_detection',
      chatId: conversationId,
      title: `Suspicious message detected: ${patterns.join(', ')}`,
      description: `User "${sender?.firstName} ${sender?.lastName}" sent a message that may contain contact information or suggest off-platform payment.`,
      chatAnalysis: {
        suspiciousMessages: [{
          messageId: 'current',
          content: this.maskSensitiveContent(messageContent),
          detectedPatterns: patterns,
          confidence: riskScore,
          timestamp: new Date(),
        }],
        overallRiskScore: riskScore,
      },
      evidence: [{
        type: 'chat_message',
        data: {
          conversationId,
          senderId,
          content: this.maskSensitiveContent(messageContent),
          patterns,
        },
        timestamp: new Date(),
      }],
    });
  }

  /**
   * Mask sensitive content for storage (partial masking)
   */
  private maskSensitiveContent(content: string): string {
    // Mask phone numbers: 08012345678 -> 0801****678
    let masked = content.replace(/\b(\d{4})(\d{4,7})(\d{3})\b/g, '$1****$3');
    
    // Mask emails: test@email.com -> t***@e***.com
    masked = masked.replace(
      /([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9])[a-zA-Z0-9.-]*\.([a-zA-Z]{2,})/g,
      '$1***@$2***.$3'
    );

    return masked;
  }

  /**
   * Detect potential off-platform meeting via location proximity
   */
  public async detectLocationProximity(
    vendorId: string,
    clientId: string,
    vendorCoords: [number, number], // [longitude, latitude]
    clientCoords: [number, number],
    timestamp: Date
  ): Promise<IRedFlag | null> {
    // Calculate distance between users
    const distanceMeters = calculateDistance(
      vendorCoords[1], vendorCoords[0], // vendor lat, lng
      clientCoords[1], clientCoords[0]  // client lat, lng
    ) * 1000; // Convert km to meters

    if (distanceMeters > PROXIMITY_THRESHOLD_METERS) {
      return null; // Not close enough
    }

    // Check if there's an active/accepted booking between them
    const activeBooking = await Booking.findOne({
      client: clientId,
      vendor: vendorId,
      status: { $in: ['pending', 'accepted', 'in_progress'] },
      scheduledDate: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        $lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    if (activeBooking) {
      return null; // They have a booking, this is legitimate
    }

    logger.warn(`🚩 Suspicious proximity detected: Vendor ${vendorId} and Client ${clientId} are ${distanceMeters.toFixed(0)}m apart with no active booking`);

    const vendor = await User.findById(vendorId);
    const client = await User.findById(clientId);

    // Check if we already have a recent proximity flag for these users
    const recentFlag = await RedFlag.findOne({
      type: RedFlagType.LOCATION_PROXIMITY_NO_BOOKING,
      flaggedUser: vendorId,
      relatedUser: clientId,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });

    if (recentFlag) {
      // Update existing flag with new proximity data
      recentFlag.locationData = {
        ...recentFlag.locationData,
        flaggedUserLocation: {
          type: 'Point',
          coordinates: vendorCoords,
          capturedAt: timestamp,
        },
        relatedUserLocation: {
          type: 'Point',
          coordinates: clientCoords,
          capturedAt: timestamp,
        },
        distanceMeters,
        proximityDuration: (recentFlag.locationData?.proximityDuration || 0) + LOCATION_CHECK_INTERVAL_MINUTES,
      };

      if ((recentFlag.locationData?.proximityDuration || 0) >= PROXIMITY_DURATION_MINUTES * 2) {
        recentFlag.severity = RedFlagSeverity.HIGH;
      }

      await recentFlag.save();
      return recentFlag;
    }

    return this.createRedFlag({
      type: RedFlagType.LOCATION_PROXIMITY_NO_BOOKING,
      severity: RedFlagSeverity.MEDIUM,
      flaggedUserId: vendorId,
      flaggedUserRole: 'vendor',
      relatedUserId: clientId,
      relatedUserRole: 'client',
      triggerSource: 'system_auto',
      title: `Vendor and client detected at same location without booking`,
      description: `Vendor "${vendor?.vendorProfile?.businessName || vendor?.firstName}" and client "${client?.firstName} ${client?.lastName}" were detected ${distanceMeters.toFixed(0)} meters apart without an active booking. This may indicate an off-platform transaction.`,
      locationData: {
        flaggedUserLocation: {
          type: 'Point',
          coordinates: vendorCoords,
          capturedAt: timestamp,
        },
        relatedUserLocation: {
          type: 'Point',
          coordinates: clientCoords,
          capturedAt: timestamp,
        },
        distanceMeters,
        proximityDuration: LOCATION_CHECK_INTERVAL_MINUTES,
      },
      evidence: [{
        type: 'location',
        data: {
          vendorCoords,
          clientCoords,
          distanceMeters,
        },
        timestamp,
      }],
    });
  }

  /**
   * Detect suspected off-platform meeting based on patterns
   * - Conversation history between vendor and client
   * - No bookings between them OR bookings always cancelled
   * - Suspicious messages detected
   */
  public async detectSuspectedOffPlatformMeeting(
    vendorId: string,
    clientId: string
  ): Promise<IRedFlag | null> {
    // Check conversation history - find conversation where both are participants
    const conversation = await Conversation.findOne({
      participants: { $all: [vendorId, clientId] },
    });

    if (!conversation) {
      return null; // No conversation, no suspicion
    }

    // Check booking history
    const bookings = await Booking.find({
      vendor: vendorId,
      client: clientId,
    }).sort({ createdAt: -1 });

    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const totalBookings = bookings.length;

    // Count messages in this conversation
    const messageCount = await Message.countDocuments({ conversation: conversation._id });

    // Check for suspicious messages in conversation
    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    let suspiciousMessageCount = 0;

    for (const msg of messages) {
      // Only analyze text messages
      if (msg.text) {
        const { isSuspicious } = await this.analyzeChatForSuspiciousContent(
          conversation._id.toString(),
          msg.sender.toString(),
          msg.text
        );
        if (isSuspicious) suspiciousMessageCount++;
      }
    }

    // Calculate suspicion score
    let suspicionScore = 0;

    // Many messages but no bookings
    if (messageCount > 20 && totalBookings === 0) {
      suspicionScore += 0.4;
    }

    // All bookings cancelled
    if (totalBookings > 0 && cancelledBookings === totalBookings) {
      suspicionScore += 0.3;
    }

    // Suspicious messages detected
    if (suspiciousMessageCount > 0) {
      suspicionScore += 0.2 * Math.min(suspiciousMessageCount, 5);
    }

    // Threshold check
    if (suspicionScore >= 0.6) {
      const vendor = await User.findById(vendorId);
      const client = await User.findById(clientId);

      // Check for existing flag
      const existingFlag = await RedFlag.findOne({
        type: RedFlagType.SUSPECTED_OFF_PLATFORM_MEETING,
        flaggedUser: vendorId,
        relatedUser: clientId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      });

      if (existingFlag) {
        return existingFlag;
      }

      return this.createRedFlag({
        type: RedFlagType.SUSPECTED_OFF_PLATFORM_MEETING,
        severity: suspicionScore >= 0.8 ? RedFlagSeverity.HIGH : RedFlagSeverity.MEDIUM,
        flaggedUserId: vendorId,
        flaggedUserRole: 'vendor',
        relatedUserId: clientId,
        relatedUserRole: 'client',
        triggerSource: 'ai_detection',
        chatId: conversation._id.toString(),
        title: `Suspected off-platform meeting between vendor and client`,
        description: `Analysis suggests vendor "${vendor?.vendorProfile?.businessName || vendor?.firstName}" and client "${client?.firstName}" may be conducting business outside the app. Pattern: ${messageCount} messages, ${completedBookings} completed bookings, ${cancelledBookings} cancelled bookings, ${suspiciousMessageCount} suspicious messages.`,
        chatAnalysis: {
          suspiciousMessages: [],
          overallRiskScore: suspicionScore,
        },
        metrics: {
          occurrenceCount: messageCount,
          financialImpact: 0, // Unknown
        },
        evidence: [{
          type: 'log',
          data: {
            messageCount,
            totalBookings,
            completedBookings,
            cancelledBookings,
            suspiciousMessageCount,
            suspicionScore,
          },
          timestamp: new Date(),
        }],
      });
    }

    return null;
  }

  // ==================== ADMIN MANAGEMENT METHODS ====================

  /**
   * Get all red flags with filters
   */
  public async getRedFlags(
    filters?: {
      type?: RedFlagType;
      severity?: RedFlagSeverity;
      status?: RedFlagStatus;
      flaggedUserId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ flags: IRedFlag[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

    if (filters?.type) query.type = filters.type;
    if (filters?.severity) query.severity = filters.severity;
    if (filters?.status) query.status = filters.status;
    if (filters?.flaggedUserId) query.flaggedUser = filters.flaggedUserId;
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const [flags, total] = await Promise.all([
      RedFlag.find(query)
        .populate('flaggedUser', 'firstName lastName email vendorProfile.businessName')
        .populate('relatedUser', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName')
        .populate('booking', 'scheduledDate scheduledTime totalAmount')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      RedFlag.countDocuments(query),
    ]);

    return {
      flags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get red flag by ID
   */
  public async getRedFlagById(flagId: string): Promise<IRedFlag> {
    const flag = await RedFlag.findById(flagId)
      .populate('flaggedUser', 'firstName lastName email phone vendorProfile')
      .populate('relatedUser', 'firstName lastName email phone')
      .populate('booking')
      .populate('payment')
      .populate('service')
      .populate('assignedTo', 'firstName lastName')
      .populate('reportedBy', 'firstName lastName')
      .populate('adminNotes.addedBy', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');

    if (!flag) {
      throw new NotFoundError('Red flag not found');
    }

    return flag;
  }

  /**
   * Update red flag status
   */
  public async updateRedFlagStatus(
    flagId: string,
    adminId: string,
    status: RedFlagStatus,
    note?: string
  ): Promise<IRedFlag> {
    const flag = await RedFlag.findById(flagId);

    if (!flag) {
      throw new NotFoundError('Red flag not found');
    }

    flag.status = status;

    if (note) {
      flag.adminNotes.push({
        note,
        addedBy: adminId as any,
        addedAt: new Date(),
      });
    }

    await flag.save();

    logger.info(`🚩 Red flag ${flagId} status updated to ${status} by admin ${adminId}`);

    return flag;
  }

  /**
   * Resolve red flag with action
   */
  public async resolveRedFlag(
    flagId: string,
    adminId: string,
    resolution: {
      action: 'warning_issued' | 'temporary_suspension' | 'permanent_ban' | 'fine_applied' | 'no_action' | 'escalated';
      actionDetails?: string;
      notes?: string;
    }
  ): Promise<IRedFlag> {
    const flag = await RedFlag.findById(flagId);

    if (!flag) {
      throw new NotFoundError('Red flag not found');
    }

    flag.status = resolution.action === 'escalated' 
      ? RedFlagStatus.ESCALATED 
      : RedFlagStatus.ACTION_TAKEN;

    flag.resolution = {
      action: resolution.action,
      actionDetails: resolution.actionDetails,
      resolvedBy: adminId as any,
      resolvedAt: new Date(),
      notes: resolution.notes,
    };

    // Apply action to user if needed
    if (resolution.action === 'temporary_suspension' || resolution.action === 'permanent_ban') {
      await this.applyUserSanction(flag.flaggedUser.toString(), resolution.action);
    }

    await flag.save();

    // Update user's red flag count
    await this.updateUserRedFlagCount(flag.flaggedUser.toString(), flag.flaggedUserRole);

    logger.info(`🚩 Red flag ${flagId} resolved with action: ${resolution.action}`);

    return flag;
  }

  /**
   * Apply sanction to user account
   * NOTE: You'll need to add these fields to your User model
   */
  private async applyUserSanction(
    userId: string,
    action: 'temporary_suspension' | 'permanent_ban'
  ): Promise<void> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update using updateOne to avoid TypeScript issues with missing fields
    const updateData: any = {};

    if (action === 'permanent_ban') {
      updateData.isActive = false;
      updateData.isBanned = true;
      updateData.bannedAt = new Date();
      updateData.bannedReason = 'Account suspended due to policy violations';
    } else if (action === 'temporary_suspension') {
      updateData.isSuspended = true;
      updateData.suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      updateData.suspensionReason = 'Account temporarily suspended due to policy violations';
    }

    await User.updateOne({ _id: userId }, { $set: updateData });

    // Notify user
    await notificationHelper.sendNotification(
      userId,
      action === 'permanent_ban' ? 'Account Suspended' : 'Account Temporarily Suspended',
      action === 'permanent_ban'
        ? 'Your account has been permanently suspended due to policy violations. Please contact support for more information.'
        : 'Your account has been temporarily suspended for 7 days due to policy violations.',
      'account',
      { action }
    );

    logger.warn(`⛔ User ${userId} sanctioned: ${action}`);
  }

  /**
   * Assign red flag to admin
   */
  public async assignRedFlag(flagId: string, adminId: string): Promise<IRedFlag> {
    const flag = await RedFlag.findByIdAndUpdate(
      flagId,
      {
        assignedTo: adminId,
        status: RedFlagStatus.UNDER_REVIEW,
      },
      { new: true }
    );

    if (!flag) {
      throw new NotFoundError('Red flag not found');
    }

    return flag;
  }

  /**
   * Add admin note to red flag
   */
  public async addAdminNote(flagId: string, adminId: string, note: string): Promise<IRedFlag> {
    const flag = await RedFlag.findByIdAndUpdate(
      flagId,
      {
        $push: {
          adminNotes: {
            note,
            addedBy: adminId,
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!flag) {
      throw new NotFoundError('Red flag not found');
    }

    return flag;
  }

  /**
   * Get red flag statistics
   */
  public async getRedFlagStats(): Promise<any> {
    const [
      total,
      open,
      underReview,
      resolved,
      escalated,
      byType,
      bySeverity,
      last7Days,
      last30Days,
    ] = await Promise.all([
      RedFlag.countDocuments(),
      RedFlag.countDocuments({ status: RedFlagStatus.OPEN }),
      RedFlag.countDocuments({ status: RedFlagStatus.UNDER_REVIEW }),
      RedFlag.countDocuments({ status: { $in: [RedFlagStatus.RESOLVED, RedFlagStatus.ACTION_TAKEN] } }),
      RedFlag.countDocuments({ status: RedFlagStatus.ESCALATED }),
      RedFlag.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      RedFlag.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      RedFlag.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      RedFlag.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
    ]);

    return {
      total,
      byStatus: { open, underReview, resolved, escalated },
      byType: byType.reduce((acc: any, item: any) => ({ ...acc, [item._id]: item.count }), {}),
      bySeverity: bySeverity.reduce((acc: any, item: any) => ({ ...acc, [item._id]: item.count }), {}),
      trends: { last7Days, last30Days },
    };
  }

  /**
   * Get users with most red flags
   */
  public async getMostFlaggedUsers(limit: number = 10): Promise<any[]> {
    const results = await RedFlag.aggregate([
      {
        $group: {
          _id: '$flaggedUser',
          flagCount: { $sum: 1 },
          types: { $addToSet: '$type' },
          latestFlag: { $max: '$createdAt' },
        },
      },
      { $sort: { flagCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          flagCount: 1,
          types: 1,
          latestFlag: 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.email': 1,
          'user.vendorProfile.businessName': 1,
        },
      },
    ]);

    return results;
  }
}

export default new RedFlagService();