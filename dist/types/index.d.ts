import { Request } from 'express';
import { Types } from 'mongoose';
export declare enum UserRole {
    CLIENT = "client",
    VENDOR = "vendor",
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    FINANCIAL_ADMIN = "financial_admin",
    ANALYTICS_ADMIN = "analytics_admin",
    SUPPORT = "support"
}
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    PENDING_VERIFICATION = "pending_verification"
}
export declare enum VendorType {
    HOME_SERVICE = "home_service",
    IN_SHOP = "in_shop",
    BOTH = "both"
}
export declare enum BookingStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    DISPUTED = "disputed"
}
export declare enum BookingType {
    STANDARD = "standard",
    OFFER_BASED = "offer_based"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded",
    ESCROWED = "escrowed",
    RELEASED = "released",
    PARTIALLY_REFUND = "partially_refund"
}
export interface TopVendorResponse {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    avatar?: string;
    isOnline: boolean;
    vendorProfile: {
        businessName: string;
        businessDescription?: string;
        rating: number;
        totalRatings: number;
        completedBookings: number;
        vendorType: VendorType;
        serviceRadius?: number;
        location?: {
            type: 'Point';
            coordinates: [number, number];
            address: string;
            city: string;
            state: string;
            country: string;
        };
        categories: Array<{
            _id: Types.ObjectId;
            name: string;
            icon?: string;
            slug: string;
        }>;
    };
}
export declare enum TransactionType {
    BOOKING_PAYMENT = "booking_payment",
    ORDER_PAYMENT = "order_payment",
    SUBSCRIPTION_PAYMENT = "subscription_payment",
    BOOKING_EARNING = "booking_earning",
    ORDER_EARNING = "order_earning",
    PAYMENT_RECEIVED = "payment_received",
    REFUND = "refund",
    BOOKING_REFUND = "booking_refund",
    ORDER_REFUND = "order_refund",
    CANCELLATION_PENALTY = "cancellation_penalty",
    WITHDRAWAL = "withdrawal",
    WITHDRAWAL_FEE = "withdrawal_fee",
    COMMISSION = "commission",
    COMMISSION_DEDUCTION = "commission_deduction",
    PLATFORM_FEE = "platform_fee",
    DEPOSIT = "deposit",
    WALLET_CREDIT = "wallet_credit",
    WALLET_DEBIT = "wallet_debit",
    REFERRAL_BONUS = "referral_bonus",
    ESCROW_LOCK = "escrow_lock",
    ESCROW_RELEASE = "escrow_release"
}
export declare enum NotificationType {
    BOOKING_CREATED = "booking_created",
    BOOKING_CONFIRMED = "booking_confirmed",
    BOOKING_STARTED = "booking_started",
    BOOKING_COMPLETED = "booking_completed",
    BOOKING_CANCELLED = "booking_cancelled",
    BOOKING_RESCHEDULED = "booking_rescheduled",
    BOOKING_REMINDER = "booking_reminder",
    ADMIN_ALERT = "admin_alert",
    VENDOR_RED_FLAG = "vendor_red_flag",
    VENDOR_SUSPENDED = "vendor_suspended",
    NEW_MESSAGE = "new_message",
    PAYMENT_RECEIVED = "payment_received",
    PAYMENT_SUCCESSFUL = "payment_successful",
    PAYMENT_FAILED = "payment_failed",
    PAYMENT_REFUNDED = "payment_refunded",
    WITHDRAWAL_APPROVED = "withdrawal_approved",
    WITHDRAWAL_REJECTED = "withdrawal_rejected",
    NEW_REVIEW = "new_review",
    REVIEW_RESPONSE = "review_response",
    DISPUTE_CREATED = "dispute_created",
    DISPUTE_UPDATED = "dispute_updated",
    DISPUTE_RESOLVED = "dispute_resolved",
    PROMOTIONAL = "promotional",
    NEW_OFFER = "new_offer",
    SYSTEM_ANNOUNCEMENT = "system_announcement",
    ACCOUNT_UPDATE = "account_update",
    NEW_OFFER_NEARBY = "new_offer_nearby",
    OFFER_RESPONSE = "offer_response",
    OFFER_ACCEPTED = "offer_accepted",
    OFFER_COUNTER = "offer_counter",
    NEW_ORDER = "new_order",
    ORDER_STATUS_UPDATE = "order_status_update",
    ORDER_UPDATE = "order_update",
    ORDER_CANCELLED = "order_cancelled"
}
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare enum OrderDeliveryType {
    HOME_DELIVERY = "home_delivery",
    PICKUP = "pickup"
}
export declare enum OrderPaymentMethod {
    CARD = "card",
    WALLET = "wallet",
    BANK_TRANSFER = "bank_transfer",
    USSD = "ussd"
}
export declare enum EscrowStatus {
    PENDING = "pending",
    HELD = "held",
    RELEASED = "released",
    REFUNDED = "refunded"
}
export interface OrderItem {
    product: Types.ObjectId | string;
    quantity: number;
    price: number;
    selectedVariant?: {
        name: string;
        option: string;
    };
}
export interface DeliveryAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    additionalInfo?: string;
    coordinates?: [number, number];
}
export interface OrderStatusHistory {
    status: OrderStatus;
    note?: string;
    updatedBy: Types.ObjectId;
    updatedAt: Date;
}
export interface DeliveryConfirmation {
    confirmedBy: 'customer' | 'seller';
    confirmedAt: Date;
}
export declare enum NotificationChannel {
    PUSH = "push",
    EMAIL = "email",
    SMS = "sms",
    IN_APP = "in_app"
}
export declare enum DisputeStatus {
    OPEN = "open",
    IN_REVIEW = "in_review",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare enum DisputeResolution {
    REFUND_CLIENT = "refund_client",
    PAY_VENDOR = "pay_vendor",
    PARTIAL_REFUND = "partial_refund"
}
export interface FileUpload {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    url?: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        pageSize: number;
        totalItems: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export interface Location {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
}
export interface AuthRequest extends Request {
    user?: {
        _id: Types.ObjectId;
        id: string;
        email: string;
        role: UserRole;
        isVendor?: boolean;
    };
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | {
        [fieldname: string]: Express.Multer.File[];
    };
}
export interface DashboardStats {
    totalUsers: number;
    totalVendors: number;
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    pendingPayments: number;
    recentBookings: any[];
    topVendors: any[];
    revenueByMonth: any[];
}
export declare enum EmailTemplate {
    WELCOME = "welcome",
    LOGIN = "login",
    VERIFICATION = "verification",
    PASSWORD_RESET = "password_reset",
    BOOKING_CONFIRMATION = "booking_confirmation",
    BOOKING_ACCEPTED = "booking_accepted",
    BOOKING_COMPLETED = "booking_completed",
    BOOKING_CANCELLED = "booking_cancelled",
    PAYMENT_RECEIVED = "payment_received",
    PAYMENT_SENT = "payment_sent",
    WITHDRAWAL_REQUEST = "withdrawal_request",
    WITHDRAWAL_COMPLETED = "withdrawal_completed",
    DISPUTE_OPENED = "dispute_opened",
    DISPUTE_RESOLVED = "dispute_resolved",
    OFFER_RECEIVED = "offer_received",
    COUNTER_OFFER = "counter_offer"
}
export declare enum SocketEvent {
    CONNECTION = "connection",
    DISCONNECT = "disconnect",
    MESSAGE = "message",
    TYPING = "typing",
    BOOKING_UPDATE = "booking_update",
    NOTIFICATION = "notification",
    ONLINE_STATUS = "online_status",
    CALL_INITIATED = "call_initiated",
    CALL_ACCEPTED = "call_accepted",
    CALL_REJECTED = "call_rejected",
    CALL_ENDED = "call_ended",
    JOIN_CONVERSATION = "join:conversation",
    LEAVE_CONVERSATION = "leave:conversation",
    MESSAGE_SEND = "message:send",
    MESSAGE_RECEIVED = "message:received",
    MESSAGE_DELIVERED = "message:delivered",
    MESSAGE_READ = "message:read",
    TYPING_START = "typing:start",
    TYPING_STOP = "typing:stop"
}
export interface ServiceCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    isActive: boolean;
}
export interface Service {
    id: string;
    name: string;
    description: string;
    category: string | Types.ObjectId;
    basePrice: number;
    duration?: number;
    images?: string[];
    isActive: boolean;
}
export interface OfferDetails {
    proposedPrice: number;
    description: string;
    estimatedDuration?: number;
    additionalNotes?: string;
}
export interface CounterOffer {
    vendorId: string | Types.ObjectId;
    originalPrice: number;
    counterPrice: number;
    reason?: string;
    createdAt: Date;
}
export interface WalletTransaction {
    amount: number;
    type: TransactionType;
    status: PaymentStatus;
    reference: string;
    description: string;
    metadata?: any;
}
export interface AnalyticsQuery {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    metrics?: string[];
}
export interface AnalyticsResult {
    metric: string;
    value: number;
    change?: number;
    percentageChange?: number;
    data?: any[];
}
export interface MessageAttachment {
    url: string;
    type: 'image' | 'file' | 'audio' | 'video';
    name?: string;
    size?: number;
}
export interface MessageReaction {
    user: Types.ObjectId;
    emoji: string;
    createdAt: Date;
}
export interface SendMessageData {
    receiverId: string;
    messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
    text?: string;
    attachments?: MessageAttachment[];
    replyTo?: string;
}
export interface TypingData {
    conversationId: string;
    userId: string;
}
export interface MessageStatusData {
    messageId: string;
    status: 'delivered' | 'read';
    deliveredAt?: Date;
    readAt?: Date;
}
export interface UserStatusData {
    userId: string;
    isOnline: boolean;
    lastSeen?: Date;
}
//# sourceMappingURL=index.d.ts.map