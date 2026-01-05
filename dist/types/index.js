"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvent = exports.EmailTemplate = exports.DisputeResolution = exports.DisputeStatus = exports.NotificationChannel = exports.EscrowStatus = exports.OrderPaymentMethod = exports.OrderDeliveryType = exports.OrderStatus = exports.NotificationType = exports.TransactionType = exports.PaymentStatus = exports.BookingType = exports.BookingStatus = exports.VendorType = exports.UserStatus = exports.UserRole = void 0;
// User Types
var UserRole;
(function (UserRole) {
    UserRole["CLIENT"] = "client";
    UserRole["VENDOR"] = "vendor";
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["ADMIN"] = "admin";
    UserRole["FINANCIAL_ADMIN"] = "financial_admin";
    UserRole["ANALYTICS_ADMIN"] = "analytics_admin";
    UserRole["SUPPORT"] = "support";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["PENDING_VERIFICATION"] = "pending_verification";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var VendorType;
(function (VendorType) {
    VendorType["HOME_SERVICE"] = "home_service";
    VendorType["IN_SHOP"] = "in_shop";
    VendorType["BOTH"] = "both";
})(VendorType || (exports.VendorType = VendorType = {}));
// Booking Types
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["ACCEPTED"] = "accepted";
    BookingStatus["IN_PROGRESS"] = "in_progress";
    BookingStatus["COMPLETED"] = "completed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["DISPUTED"] = "disputed";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var BookingType;
(function (BookingType) {
    BookingType["STANDARD"] = "standard";
    BookingType["OFFER_BASED"] = "offer_based";
})(BookingType || (exports.BookingType = BookingType = {}));
// Payment Types
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["ESCROWED"] = "escrowed";
    PaymentStatus["RELEASED"] = "released";
    PaymentStatus["PARTIALLY_REFUND"] = "partially_refund";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var TransactionType;
(function (TransactionType) {
    // Client Payments (Money OUT via card/external payment)
    TransactionType["BOOKING_PAYMENT"] = "booking_payment";
    TransactionType["ORDER_PAYMENT"] = "order_payment";
    TransactionType["SUBSCRIPTION_PAYMENT"] = "subscription_payment";
    // Vendor/Seller Earnings (Money IN to wallet)
    TransactionType["BOOKING_EARNING"] = "booking_earning";
    TransactionType["ORDER_EARNING"] = "order_earning";
    TransactionType["PAYMENT_RECEIVED"] = "payment_received";
    // Refunds (Money IN to client wallet)
    TransactionType["REFUND"] = "refund";
    TransactionType["BOOKING_REFUND"] = "booking_refund";
    TransactionType["ORDER_REFUND"] = "order_refund";
    TransactionType["CANCELLATION_PENALTY"] = "cancellation_penalty";
    // Withdrawals (Money OUT from vendor wallet)
    TransactionType["WITHDRAWAL"] = "withdrawal";
    TransactionType["WITHDRAWAL_FEE"] = "withdrawal_fee";
    // Platform Fees & Commissions
    TransactionType["COMMISSION"] = "commission";
    TransactionType["COMMISSION_DEDUCTION"] = "commission_deduction";
    TransactionType["PLATFORM_FEE"] = "platform_fee";
    // General Wallet Operations
    TransactionType["DEPOSIT"] = "deposit";
    TransactionType["WALLET_CREDIT"] = "wallet_credit";
    TransactionType["WALLET_DEBIT"] = "wallet_debit";
    // Special
    TransactionType["REFERRAL_BONUS"] = "referral_bonus";
    // Escrow Operations
    TransactionType["ESCROW_LOCK"] = "escrow_lock";
    TransactionType["ESCROW_RELEASE"] = "escrow_release";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
// Notification Types
var NotificationType;
(function (NotificationType) {
    // Booking notifications
    NotificationType["BOOKING_CREATED"] = "booking_created";
    NotificationType["BOOKING_CONFIRMED"] = "booking_confirmed";
    NotificationType["BOOKING_STARTED"] = "booking_started";
    NotificationType["BOOKING_COMPLETED"] = "booking_completed";
    NotificationType["BOOKING_CANCELLED"] = "booking_cancelled";
    NotificationType["BOOKING_RESCHEDULED"] = "booking_rescheduled";
    NotificationType["BOOKING_REMINDER"] = "booking_reminder";
    NotificationType["ADMIN_ALERT"] = "admin_alert";
    NotificationType["VENDOR_RED_FLAG"] = "vendor_red_flag";
    NotificationType["VENDOR_SUSPENDED"] = "vendor_suspended";
    // Message notifications
    NotificationType["NEW_MESSAGE"] = "new_message";
    // Payment notifications
    NotificationType["PAYMENT_RECEIVED"] = "payment_received";
    NotificationType["PAYMENT_SUCCESSFUL"] = "payment_successful";
    NotificationType["PAYMENT_FAILED"] = "payment_failed";
    NotificationType["PAYMENT_REFUNDED"] = "payment_refunded";
    NotificationType["WITHDRAWAL_APPROVED"] = "withdrawal_approved";
    NotificationType["WITHDRAWAL_REJECTED"] = "withdrawal_rejected";
    // Review notifications
    NotificationType["NEW_REVIEW"] = "new_review";
    NotificationType["REVIEW_RESPONSE"] = "review_response";
    // Dispute notifications
    NotificationType["DISPUTE_CREATED"] = "dispute_created";
    NotificationType["DISPUTE_UPDATED"] = "dispute_updated";
    NotificationType["DISPUTE_RESOLVED"] = "dispute_resolved";
    // Promotional
    NotificationType["PROMOTIONAL"] = "promotional";
    NotificationType["NEW_OFFER"] = "new_offer";
    // System
    NotificationType["SYSTEM_ANNOUNCEMENT"] = "system_announcement";
    NotificationType["ACCOUNT_UPDATE"] = "account_update";
    // ✅ NEW - Offer-related
    NotificationType["NEW_OFFER_NEARBY"] = "new_offer_nearby";
    NotificationType["OFFER_RESPONSE"] = "offer_response";
    NotificationType["OFFER_ACCEPTED"] = "offer_accepted";
    NotificationType["OFFER_COUNTER"] = "offer_counter";
    // ✅ NEW - Order-related
    NotificationType["NEW_ORDER"] = "new_order";
    NotificationType["ORDER_STATUS_UPDATE"] = "order_status_update";
    NotificationType["ORDER_UPDATE"] = "order_update";
    NotificationType["ORDER_CANCELLED"] = "order_cancelled";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// Add this to your types/index.ts file
// ==================== 📦 ORDER TYPES ====================
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["SHIPPED"] = "shipped";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["REFUNDED"] = "refunded";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OrderDeliveryType;
(function (OrderDeliveryType) {
    OrderDeliveryType["HOME_DELIVERY"] = "home_delivery";
    OrderDeliveryType["PICKUP"] = "pickup";
})(OrderDeliveryType || (exports.OrderDeliveryType = OrderDeliveryType = {}));
var OrderPaymentMethod;
(function (OrderPaymentMethod) {
    OrderPaymentMethod["CARD"] = "card";
    OrderPaymentMethod["WALLET"] = "wallet";
    OrderPaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    OrderPaymentMethod["USSD"] = "ussd";
})(OrderPaymentMethod || (exports.OrderPaymentMethod = OrderPaymentMethod = {}));
var EscrowStatus;
(function (EscrowStatus) {
    EscrowStatus["PENDING"] = "pending";
    EscrowStatus["HELD"] = "held";
    EscrowStatus["RELEASED"] = "released";
    EscrowStatus["REFUNDED"] = "refunded";
})(EscrowStatus || (exports.EscrowStatus = EscrowStatus = {}));
// ==================== END ORDER TYPES ====================
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["IN_APP"] = "in_app";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
// Dispute Types
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "open";
    DisputeStatus["IN_REVIEW"] = "in_review";
    DisputeStatus["RESOLVED"] = "resolved";
    DisputeStatus["CLOSED"] = "closed";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
var DisputeResolution;
(function (DisputeResolution) {
    DisputeResolution["REFUND_CLIENT"] = "refund_client";
    DisputeResolution["PAY_VENDOR"] = "pay_vendor";
    DisputeResolution["PARTIAL_REFUND"] = "partial_refund";
})(DisputeResolution || (exports.DisputeResolution = DisputeResolution = {}));
// Email Template Types
var EmailTemplate;
(function (EmailTemplate) {
    EmailTemplate["WELCOME"] = "welcome";
    EmailTemplate["LOGIN"] = "login";
    EmailTemplate["VERIFICATION"] = "verification";
    EmailTemplate["PASSWORD_RESET"] = "password_reset";
    EmailTemplate["BOOKING_CONFIRMATION"] = "booking_confirmation";
    EmailTemplate["BOOKING_ACCEPTED"] = "booking_accepted";
    EmailTemplate["BOOKING_COMPLETED"] = "booking_completed";
    EmailTemplate["BOOKING_CANCELLED"] = "booking_cancelled";
    EmailTemplate["PAYMENT_RECEIVED"] = "payment_received";
    EmailTemplate["PAYMENT_SENT"] = "payment_sent";
    EmailTemplate["WITHDRAWAL_REQUEST"] = "withdrawal_request";
    EmailTemplate["WITHDRAWAL_COMPLETED"] = "withdrawal_completed";
    EmailTemplate["DISPUTE_OPENED"] = "dispute_opened";
    EmailTemplate["DISPUTE_RESOLVED"] = "dispute_resolved";
    EmailTemplate["OFFER_RECEIVED"] = "offer_received";
    EmailTemplate["COUNTER_OFFER"] = "counter_offer";
})(EmailTemplate || (exports.EmailTemplate = EmailTemplate = {}));
// WebSocket Event Types
var SocketEvent;
(function (SocketEvent) {
    SocketEvent["CONNECTION"] = "connection";
    SocketEvent["DISCONNECT"] = "disconnect";
    SocketEvent["MESSAGE"] = "message";
    SocketEvent["TYPING"] = "typing";
    SocketEvent["BOOKING_UPDATE"] = "booking_update";
    SocketEvent["NOTIFICATION"] = "notification";
    SocketEvent["ONLINE_STATUS"] = "online_status";
    SocketEvent["CALL_INITIATED"] = "call_initiated";
    SocketEvent["CALL_ACCEPTED"] = "call_accepted";
    SocketEvent["CALL_REJECTED"] = "call_rejected";
    SocketEvent["CALL_ENDED"] = "call_ended";
    // ✅ Added message-specific events
    SocketEvent["JOIN_CONVERSATION"] = "join:conversation";
    SocketEvent["LEAVE_CONVERSATION"] = "leave:conversation";
    SocketEvent["MESSAGE_SEND"] = "message:send";
    SocketEvent["MESSAGE_RECEIVED"] = "message:received";
    SocketEvent["MESSAGE_DELIVERED"] = "message:delivered";
    SocketEvent["MESSAGE_READ"] = "message:read";
    SocketEvent["TYPING_START"] = "typing:start";
    SocketEvent["TYPING_STOP"] = "typing:stop";
})(SocketEvent || (exports.SocketEvent = SocketEvent = {}));
//# sourceMappingURL=index.js.map