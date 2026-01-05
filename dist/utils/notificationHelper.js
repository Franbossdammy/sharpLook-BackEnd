"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_service_1 = __importDefault(require("../services/notification.service"));
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
const User_1 = __importDefault(require("../models/User"));
class NotificationHelper {
    /**
     * Extract ObjectId string from object or string
     * @returns string or undefined (never null)
     */
    extractId(value) {
        if (!value)
            return undefined;
        if (typeof value === 'string')
            return value;
        if (value._id) {
            return typeof value._id === 'string'
                ? value._id
                : value._id.toString();
        }
        if (value.toString && typeof value.toString === 'function') {
            try {
                return value.toString();
            }
            catch {
                return undefined;
            }
        }
        return undefined;
    }
    /**
     * Send booking created notification to BOTH client and vendor
     */
    async notifyBookingCreated(booking) {
        try {
            const vendorId = this.extractId(booking.vendor);
            const clientId = this.extractId(booking.client);
            const bookingId = this.extractId(booking._id);
            // Notify Vendor - New booking request
            if (vendorId) {
                await notification_service_1.default.createNotification({
                    userId: vendorId,
                    type: types_1.NotificationType.BOOKING_CREATED,
                    title: 'New Booking Request',
                    message: `You have a new booking request for ${booking.service?.name || 'your service'}`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        email: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        clientName: booking.client?.firstName,
                        serviceName: booking.service?.name,
                        scheduledDate: booking.scheduledDate,
                        totalAmount: booking.totalAmount,
                    },
                });
            }
            // Notify Client - Booking confirmation
            if (clientId) {
                await notification_service_1.default.createNotification({
                    userId: clientId,
                    type: types_1.NotificationType.BOOKING_CREATED,
                    title: 'Booking Created Successfully',
                    message: `Your booking request has been sent. Booking #${booking.bookingNumber || 'pending'}`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        scheduledDate: booking.scheduledDate,
                        totalAmount: booking.totalAmount,
                    },
                });
            }
            logger_1.default.info(`Booking created notifications sent for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send booking created notification:', error);
        }
    }
    /**
     * Send booking accepted notification to BOTH client and vendor
     */
    async notifyBookingAccepted(booking) {
        try {
            const clientId = this.extractId(booking.client);
            const vendorId = this.extractId(booking.vendor);
            const bookingId = this.extractId(booking._id);
            // Notify Client - Booking accepted
            if (clientId) {
                await notification_service_1.default.createNotification({
                    userId: clientId,
                    type: types_1.NotificationType.BOOKING_CONFIRMED,
                    title: 'Booking Accepted',
                    message: `Your booking has been accepted by ${booking.vendor?.vendorProfile?.businessName || 'the vendor'}`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        email: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        vendorName: booking.vendor?.vendorProfile?.businessName,
                        scheduledDate: booking.scheduledDate,
                    },
                });
            }
            // Notify Vendor - Confirmation that they accepted
            if (vendorId) {
                await notification_service_1.default.createNotification({
                    userId: vendorId,
                    type: types_1.NotificationType.BOOKING_CONFIRMED,
                    title: 'Booking Accepted',
                    message: `You have accepted the booking from ${booking.client?.firstName || 'client'}`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        clientName: booking.client?.firstName,
                        scheduledDate: booking.scheduledDate,
                    },
                });
            }
            logger_1.default.info(`Booking accepted notifications sent for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send booking accepted notification:', error);
        }
    }
    /**
     * Send booking rejected notification to BOTH client and vendor
     */
    async notifyBookingRejected(booking, reason) {
        try {
            const clientId = this.extractId(booking.client);
            const vendorId = this.extractId(booking.vendor);
            const bookingId = this.extractId(booking._id);
            // Notify Client - Booking rejected
            if (clientId) {
                await notification_service_1.default.createNotification({
                    userId: clientId,
                    type: types_1.NotificationType.BOOKING_CANCELLED,
                    title: 'Booking Rejected',
                    message: `Your booking has been rejected by the vendor. ${reason ? `Reason: ${reason}` : ''}`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        email: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        reason: reason,
                        refundAmount: booking.totalAmount,
                    },
                });
            }
            // Notify Vendor - Confirmation of rejection
            if (vendorId) {
                await notification_service_1.default.createNotification({
                    userId: vendorId,
                    type: types_1.NotificationType.BOOKING_CANCELLED,
                    title: 'Booking Rejected',
                    message: `You have rejected the booking from ${booking.client?.firstName || 'client'}`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        reason: reason,
                    },
                });
            }
            logger_1.default.info(`Booking rejected notifications sent for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send booking rejected notification:', error);
        }
    }
    /**
     * Send booking started notification to BOTH client and vendor
     */
    async notifyBookingStarted(booking) {
        try {
            const clientId = this.extractId(booking.client);
            const vendorId = this.extractId(booking.vendor);
            const bookingId = this.extractId(booking._id);
            // Notify Client - Service started
            if (clientId) {
                await notification_service_1.default.createNotification({
                    userId: clientId,
                    type: types_1.NotificationType.BOOKING_STARTED,
                    title: 'Service Started',
                    message: `${booking.vendor?.vendorProfile?.businessName || 'The vendor'} has started working on your service`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        vendorName: booking.vendor?.vendorProfile?.businessName,
                    },
                });
            }
            // Notify Vendor - Confirmation of start
            if (vendorId) {
                await notification_service_1.default.createNotification({
                    userId: vendorId,
                    type: types_1.NotificationType.BOOKING_STARTED,
                    title: 'Booking In Progress',
                    message: `You have started working on the booking for ${booking.client?.firstName || 'client'}`,
                    relatedBooking: bookingId,
                    actionUrl: `/bookings/${booking._id}`,
                    channels: {
                        push: true,
                        inApp: true,
                    },
                    data: {
                        bookingId: booking._id,
                        clientName: booking.client?.firstName,
                    },
                });
            }
            logger_1.default.info(`Booking started notifications sent for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send booking started notification:', error);
        }
    }
    /**
     * Send partial completion notification (when one party marks complete)
     */
    async notifyPartialCompletion(booking, recipient, completedBy) {
        try {
            const recipientId = recipient === 'client'
                ? this.extractId(booking.client)
                : this.extractId(booking.vendor);
            const bookingId = this.extractId(booking._id);
            if (!recipientId) {
                logger_1.default.error(`${recipient} ID not found in booking`);
                return;
            }
            const message = completedBy === 'client'
                ? 'The client has marked this booking as complete. Please confirm completion to receive payment.'
                : 'The vendor has marked this service as complete. Please confirm if you are satisfied.';
            const title = completedBy === 'client'
                ? 'Client Confirmed Completion'
                : 'Vendor Marked Complete';
            await notification_service_1.default.createNotification({
                userId: recipientId,
                type: types_1.NotificationType.BOOKING_COMPLETED,
                title,
                message,
                relatedBooking: bookingId,
                actionUrl: `/bookings/${booking._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    bookingId: booking._id,
                    completedBy,
                    requiresConfirmation: true,
                },
            });
            logger_1.default.info(`Partial completion notification sent to ${recipient} for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send partial completion notification:', error);
        }
    }
    /**
     * Send booking completed notification to BOTH client and vendor
     */
    async notifyBookingCompleted(booking, recipientId, role) {
        try {
            const bookingId = this.extractId(booking._id);
            const message = role === 'client'
                ? 'Your service has been completed successfully. Please leave a review!'
                : `Payment of ₦${booking.totalAmount?.toLocaleString()} has been released to your wallet.`;
            await notification_service_1.default.createNotification({
                userId: recipientId,
                type: types_1.NotificationType.BOOKING_COMPLETED,
                title: 'Booking Completed',
                message,
                relatedBooking: bookingId,
                actionUrl: `/bookings/${booking._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    bookingId: booking._id,
                    totalAmount: booking.totalAmount,
                    canReview: role === 'client',
                },
            });
            logger_1.default.info(`Booking completed notification sent to ${role} for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send booking completed notification:', error);
        }
    }
    /**
     * Send booking cancelled notification to BOTH parties
     */
    async notifyBookingCancelled(booking, cancelledBy, reason) {
        try {
            const clientId = this.extractId(booking.client);
            const vendorId = this.extractId(booking.vendor);
            const bookingId = this.extractId(booking._id);
            if (cancelledBy === 'client') {
                // Notify Vendor - Client cancelled
                if (vendorId) {
                    await notification_service_1.default.createNotification({
                        userId: vendorId,
                        type: types_1.NotificationType.BOOKING_CANCELLED,
                        title: 'Booking Cancelled',
                        message: `The client has cancelled this booking. ${reason ? `Reason: ${reason}` : ''}`,
                        relatedBooking: bookingId,
                        actionUrl: `/bookings/${booking._id}`,
                        channels: {
                            push: true,
                            email: true,
                            inApp: true,
                        },
                        data: {
                            bookingId: booking._id,
                            cancelledBy,
                            reason,
                        },
                    });
                }
                // Notify Client - Confirmation
                if (clientId) {
                    await notification_service_1.default.createNotification({
                        userId: clientId,
                        type: types_1.NotificationType.BOOKING_CANCELLED,
                        title: 'Booking Cancelled',
                        message: `You have cancelled this booking. ${booking.paymentStatus === 'escrowed' ? 'Your payment will be refunded.' : ''}`,
                        relatedBooking: bookingId,
                        actionUrl: `/bookings/${booking._id}`,
                        channels: {
                            push: true,
                            inApp: true,
                        },
                        data: {
                            bookingId: booking._id,
                            refundAmount: booking.totalAmount,
                        },
                    });
                }
            }
            else {
                // Notify Client - Vendor cancelled
                if (clientId) {
                    await notification_service_1.default.createNotification({
                        userId: clientId,
                        type: types_1.NotificationType.BOOKING_CANCELLED,
                        title: 'Booking Cancelled',
                        message: `The vendor has cancelled this booking. ${reason ? `Reason: ${reason}` : ''} ${booking.paymentStatus === 'escrowed' ? 'Your payment will be refunded.' : ''}`,
                        relatedBooking: bookingId,
                        actionUrl: `/bookings/${booking._id}`,
                        channels: {
                            push: true,
                            email: true,
                            inApp: true,
                        },
                        data: {
                            bookingId: booking._id,
                            cancelledBy,
                            reason,
                            refundAmount: booking.totalAmount,
                        },
                    });
                }
                // Notify Vendor - Confirmation
                if (vendorId) {
                    await notification_service_1.default.createNotification({
                        userId: vendorId,
                        type: types_1.NotificationType.BOOKING_CANCELLED,
                        title: 'Booking Cancelled',
                        message: 'You have cancelled this booking.',
                        relatedBooking: bookingId,
                        actionUrl: `/bookings/${booking._id}`,
                        channels: {
                            push: true,
                            inApp: true,
                        },
                        data: {
                            bookingId: booking._id,
                            reason,
                        },
                    });
                }
            }
            logger_1.default.info(`Booking cancelled notifications sent for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send booking cancelled notification:', error);
        }
    }
    /**
     * Send booking reminder notification
     */
    async notifyBookingReminder(booking, recipientId, hoursUntil) {
        try {
            const bookingId = this.extractId(booking._id);
            await notification_service_1.default.createNotification({
                userId: recipientId,
                type: types_1.NotificationType.BOOKING_REMINDER,
                title: 'Upcoming Booking Reminder',
                message: `Your booking is scheduled in ${hoursUntil} hours`,
                relatedBooking: bookingId,
                actionUrl: `/bookings/${booking._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    bookingId: booking._id,
                    scheduledDate: booking.scheduledDate,
                    hoursUntil,
                },
            });
            logger_1.default.info(`Booking reminder notification sent for booking ${booking._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send booking reminder notification:', error);
        }
    }
    /**
     * Send payment received notification to vendor
     */
    async notifyPaymentReceived(payment, vendorId) {
        try {
            const paymentId = this.extractId(payment._id);
            const bookingId = this.extractId(payment.booking);
            await notification_service_1.default.createNotification({
                userId: vendorId,
                type: types_1.NotificationType.PAYMENT_RECEIVED,
                title: 'Payment Received',
                message: `You received ₦${payment.amount.toLocaleString()} for booking #${payment.bookingNumber}`,
                relatedPayment: paymentId,
                relatedBooking: bookingId,
                actionUrl: `/wallet`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    paymentId: payment._id,
                    amount: payment.amount,
                    bookingNumber: payment.bookingNumber,
                },
            });
            logger_1.default.info(`Payment received notification sent for payment ${payment._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send payment received notification:', error);
        }
    }
    /**
     * Send payment successful notification to client
     */
    async notifyPaymentSuccessful(payment, clientId) {
        try {
            const paymentId = this.extractId(payment._id);
            const bookingId = this.extractId(payment.booking);
            await notification_service_1.default.createNotification({
                userId: clientId,
                type: types_1.NotificationType.PAYMENT_SUCCESSFUL,
                title: 'Payment Successful',
                message: `Your payment of ₦${payment.amount.toLocaleString()} was successful`,
                relatedPayment: paymentId,
                relatedBooking: bookingId,
                actionUrl: `/bookings/${payment.booking}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    paymentId: payment._id,
                    amount: payment.amount,
                    bookingNumber: payment.bookingNumber,
                },
            });
            logger_1.default.info(`Payment successful notification sent for payment ${payment._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send payment successful notification:', error);
        }
    }
    /**
     * Send payment failed notification
     */
    async notifyPaymentFailed(payment, userId, reason) {
        try {
            const paymentId = this.extractId(payment._id);
            const bookingId = this.extractId(payment.booking);
            await notification_service_1.default.createNotification({
                userId,
                type: types_1.NotificationType.PAYMENT_FAILED,
                title: 'Payment Failed',
                message: `Your payment of ₦${payment.amount.toLocaleString()} failed. ${reason || 'Please try again.'}`,
                relatedPayment: paymentId,
                relatedBooking: bookingId,
                actionUrl: `/bookings/${payment.booking}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    paymentId: payment._id,
                    amount: payment.amount,
                    reason,
                },
            });
            logger_1.default.info(`Payment failed notification sent for payment ${payment._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send payment failed notification:', error);
        }
    }
    /**
     * Send payment refund notification
     */
    async notifyPaymentRefunded(payment, userId) {
        try {
            const paymentId = this.extractId(payment._id);
            const bookingId = this.extractId(payment.booking);
            await notification_service_1.default.createNotification({
                userId,
                type: types_1.NotificationType.PAYMENT_REFUNDED,
                title: 'Payment Refunded',
                message: `₦${payment.amount.toLocaleString()} has been refunded to your account`,
                relatedPayment: paymentId,
                relatedBooking: bookingId,
                actionUrl: `/wallet`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    paymentId: payment._id,
                    amount: payment.amount,
                },
            });
            logger_1.default.info(`Payment refund notification sent for payment ${payment._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send payment refund notification:', error);
        }
    }
    /**
     * Send new message notification
     */
    async notifyNewMessage(message, recipientId, senderName) {
        try {
            const messageId = this.extractId(message._id);
            await notification_service_1.default.createNotification({
                userId: recipientId,
                type: types_1.NotificationType.NEW_MESSAGE,
                title: 'New Message',
                message: `${senderName}: ${message.content?.substring(0, 50)}${message.content?.length > 50 ? '...' : ''}`,
                relatedMessage: messageId,
                actionUrl: `/messages/${message.conversation}`,
                channels: {
                    push: true,
                    inApp: true,
                },
                data: {
                    messageId: message._id,
                    conversationId: message.conversation,
                    senderName,
                },
            });
            logger_1.default.info(`New message notification sent for message ${message._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send new message notification:', error);
        }
    }
    /**
     * Send new review notification to vendor
     */
    async notifyNewReview(review, vendorId) {
        try {
            const reviewId = this.extractId(review._id);
            const bookingId = this.extractId(review.booking);
            await notification_service_1.default.createNotification({
                userId: vendorId,
                type: types_1.NotificationType.NEW_REVIEW,
                title: 'New Review',
                message: `You received a ${review.rating}-star review from ${review.reviewer?.firstName}`,
                relatedReview: reviewId,
                relatedBooking: bookingId,
                actionUrl: `/reviews/${review._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    reviewId: review._id,
                    rating: review.rating,
                    reviewerName: review.reviewer?.firstName,
                },
            });
            logger_1.default.info(`New review notification sent for review ${review._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send new review notification:', error);
        }
    }
    /**
     * Send review response notification to client
     */
    async notifyReviewResponse(review, clientId, vendorName) {
        try {
            const reviewId = this.extractId(review._id);
            await notification_service_1.default.createNotification({
                userId: clientId,
                type: types_1.NotificationType.REVIEW_RESPONSE,
                title: 'Vendor Responded to Your Review',
                message: `${vendorName} responded to your review`,
                relatedReview: reviewId,
                actionUrl: `/reviews/${review._id}`,
                channels: {
                    push: true,
                    inApp: true,
                },
                data: {
                    reviewId: review._id,
                    vendorName,
                },
            });
            logger_1.default.info(`Review response notification sent for review ${review._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send review response notification:', error);
        }
    }
    /**
     * Send dispute created notification
     */
    async notifyDisputeCreated(dispute, respondentId, initiatorName) {
        try {
            const disputeId = this.extractId(dispute._id);
            const bookingId = this.extractId(dispute.booking?._id || dispute.booking);
            await notification_service_1.default.createNotification({
                userId: respondentId,
                type: types_1.NotificationType.DISPUTE_CREATED,
                title: 'New Dispute',
                message: `${initiatorName} has opened a dispute regarding booking #${dispute.booking?.bookingNumber}`,
                relatedDispute: disputeId,
                relatedBooking: bookingId,
                actionUrl: `/disputes/${dispute._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    disputeId: dispute._id,
                    disputeNumber: dispute.disputeNumber,
                    initiatorName,
                },
            });
            logger_1.default.info(`Dispute created notification sent for dispute ${dispute._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send dispute created notification:', error);
        }
    }
    /**
     * Send dispute updated notification
     */
    async notifyDisputeUpdated(dispute, recipientId) {
        try {
            const disputeId = this.extractId(dispute._id);
            await notification_service_1.default.createNotification({
                userId: recipientId,
                type: types_1.NotificationType.DISPUTE_UPDATED,
                title: 'Dispute Updated',
                message: `Your dispute #${dispute.disputeNumber} has been updated`,
                relatedDispute: disputeId,
                actionUrl: `/disputes/${dispute._id}`,
                channels: {
                    push: true,
                    inApp: true,
                },
                data: {
                    disputeId: dispute._id,
                    disputeNumber: dispute.disputeNumber,
                    status: dispute.status,
                },
            });
            logger_1.default.info(`Dispute updated notification sent for dispute ${dispute._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send dispute updated notification:', error);
        }
    }
    /**
     * Send dispute resolved notification
     */
    async notifyDisputeResolved(dispute, recipientId) {
        try {
            const disputeId = this.extractId(dispute._id);
            await notification_service_1.default.createNotification({
                userId: recipientId,
                type: types_1.NotificationType.DISPUTE_RESOLVED,
                title: 'Dispute Resolved',
                message: `Your dispute #${dispute.disputeNumber} has been resolved`,
                relatedDispute: disputeId,
                actionUrl: `/disputes/${dispute._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    disputeId: dispute._id,
                    disputeNumber: dispute.disputeNumber,
                    resolution: dispute.resolution,
                },
            });
            logger_1.default.info(`Dispute resolved notification sent for dispute ${dispute._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send dispute resolved notification:', error);
        }
    }
    /**
     * Send withdrawal approved notification
     */
    async notifyWithdrawalApproved(withdrawal, vendorId) {
        try {
            await notification_service_1.default.createNotification({
                userId: vendorId,
                type: types_1.NotificationType.WITHDRAWAL_APPROVED,
                title: 'Withdrawal Approved',
                message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been approved and will be processed shortly`,
                actionUrl: `/wallet/withdrawals`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    withdrawalId: withdrawal._id,
                    amount: withdrawal.amount,
                },
            });
            logger_1.default.info(`Withdrawal approved notification sent for withdrawal ${withdrawal._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send withdrawal approved notification:', error);
        }
    }
    /**
     * Send withdrawal rejected notification
     */
    async notifyWithdrawalRejected(withdrawal, vendorId, reason) {
        try {
            await notification_service_1.default.createNotification({
                userId: vendorId,
                type: types_1.NotificationType.WITHDRAWAL_REJECTED,
                title: 'Withdrawal Rejected',
                message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been rejected. ${reason || ''}`,
                actionUrl: `/wallet/withdrawals`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    withdrawalId: withdrawal._id,
                    amount: withdrawal.amount,
                    reason,
                },
            });
            logger_1.default.info(`Withdrawal rejected notification sent for withdrawal ${withdrawal._id}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send withdrawal rejected notification:', error);
        }
    }
    /**
     * Notify user about wallet credited (deposit successful)
     */
    async notifyWalletCredited(transaction, userId) {
        try {
            await notification_service_1.default.createNotification({
                userId,
                type: types_1.NotificationType.PAYMENT_SUCCESSFUL,
                title: '💰 Wallet Funded',
                message: `Your wallet has been credited with ₦${transaction.amount.toLocaleString()}`,
                actionUrl: `/wallet`,
                channels: {
                    push: true,
                    inApp: true,
                },
                data: {
                    transaction: transaction._id,
                    amount: transaction.amount,
                    newBalance: transaction.balanceAfter,
                },
            });
            logger_1.default.info(`Wallet credit notification sent to user ${userId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send wallet credit notification:', error);
        }
    }
    /**
     * Notify user about withdrawal completed
     */
    async notifyWithdrawalCompleted(withdrawal, userId) {
        try {
            await notification_service_1.default.createNotification({
                userId,
                type: types_1.NotificationType.WITHDRAWAL_APPROVED,
                title: '✅ Withdrawal Completed',
                message: `Your withdrawal of ₦${withdrawal.netAmount.toLocaleString()} has been transferred to your ${withdrawal.bankName} account`,
                actionUrl: `/wallet/withdrawals`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    withdrawal: withdrawal._id,
                    amount: withdrawal.amount,
                    netAmount: withdrawal.netAmount,
                    bankName: withdrawal.bankName,
                    accountNumber: withdrawal.accountNumber,
                },
            });
            logger_1.default.info(`Withdrawal completed notification sent to user ${userId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send withdrawal completed notification:', error);
        }
    }
    /**
     * Send promotional notification
     */
    async notifyPromotion(userIds, title, message, actionUrl, _data) {
        try {
            await notification_service_1.default.sendBulkNotifications(userIds, {
                type: types_1.NotificationType.PROMOTIONAL,
                title,
                message,
                actionUrl,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
            });
            logger_1.default.info(`Promotional notification sent to ${userIds.length} users`);
        }
        catch (error) {
            logger_1.default.error('Failed to send promotional notification:', error);
        }
    }
    /**
     * Send system announcement
     */
    async notifySystemAnnouncement(userIds, title, message, actionUrl) {
        try {
            await notification_service_1.default.sendBulkNotifications(userIds, {
                type: types_1.NotificationType.SYSTEM_ANNOUNCEMENT,
                title,
                message,
                actionUrl,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
            });
            logger_1.default.info(`System announcement sent to ${userIds.length} users`);
        }
        catch (error) {
            logger_1.default.error('Failed to send system announcement:', error);
        }
    }
    /**
     * Notify vendors about new offer in their service area
     */
    async notifyVendorsAboutNewOffer(offer, nearbyVendorIds) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔔 [NOTIFY VENDORS ABOUT NEW OFFER] START');
        console.log('═══════════════════════════════════════════════════════════');
        try {
            console.log('📊 Input Parameters:');
            console.log('  - Offer ID:', offer._id);
            console.log('  - Offer title:', offer.title);
            console.log('  - Proposed price:', offer.proposedPrice);
            console.log('  - Nearby vendor IDs count:', nearbyVendorIds.length);
            console.log('  - Nearby vendor IDs:', nearbyVendorIds);
            console.log('  - Client info:', {
                id: offer.client?._id,
                firstName: offer.client?.firstName,
                lastName: offer.client?.lastName
            });
            console.log('');
            if (!nearbyVendorIds || nearbyVendorIds.length === 0) {
                console.log('⚠️ WARNING: No nearby vendors provided');
                console.log('═══════════════════════════════════════════════════════════');
                logger_1.default.info('No nearby vendors to notify');
                return;
            }
            const offerId = this.extractId(offer._id);
            const clientName = offer.client?.firstName || 'A client';
            console.log('🔍 Extracted Data:');
            console.log('  - Offer ID (extracted):', offerId);
            console.log('  - Client name:', clientName);
            console.log('');
            // Prepare notification data
            const notificationData = {
                type: types_1.NotificationType.NEW_OFFER_NEARBY,
                title: '🔔 New Service Request Near You!',
                message: `${clientName} posted "${offer.title}" in your area - ₦${offer.proposedPrice.toLocaleString()}`,
                actionUrl: `/offers/${offer._id}`,
                channels: {
                    push: true,
                    inApp: true,
                },
            };
            console.log('📝 Notification Data Prepared:');
            console.log(JSON.stringify(notificationData, null, 2));
            console.log('');
            console.log('📤 Calling notificationService.sendBulkNotifications...');
            console.log('');
            // Send bulk notifications to all nearby vendors
            await notification_service_1.default.sendBulkNotifications(nearbyVendorIds, notificationData);
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ [NOTIFY VENDORS ABOUT NEW OFFER] COMPLETE');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`📊 Summary: Notified ${nearbyVendorIds.length} vendors about offer ${offerId}`);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');
            logger_1.default.info(`Notified ${nearbyVendorIds.length} vendors about offer ${offerId}`);
        }
        catch (error) {
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('❌ [NOTIFY VENDORS ABOUT NEW OFFER] ERROR');
            console.log('═══════════════════════════════════════════════════════════');
            console.error('Error details:');
            console.error('  - Message:', error.message);
            console.error('  - Stack:', error.stack);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');
            logger_1.default.error('Failed to notify vendors about new offer:', error);
        }
    }
    /**
     * Notify client when vendor responds to offer
     */
    async notifyOfferResponse(offer, vendorId, response) {
        try {
            const clientId = this.extractId(offer.client);
            const vendor = response.vendor || (await User_1.default.findById(vendorId));
            if (!clientId) {
                logger_1.default.error('Client ID not found in offer');
                return;
            }
            const vendorName = vendor?.vendorProfile?.businessName || vendor?.firstName || 'A vendor';
            await notification_service_1.default.createNotification({
                userId: clientId,
                type: types_1.NotificationType.OFFER_RESPONSE,
                title: '💼 New Response to Your Request',
                message: `${vendorName} responded to "${offer.title}" with ₦${response.proposedPrice.toLocaleString()}`,
                actionUrl: `/offers/${offer._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    offerId: offer._id,
                    vendorId: vendorId,
                    vendorName,
                    proposedPrice: response.proposedPrice,
                    message: response.message,
                },
            });
            logger_1.default.info(`Offer response notification sent to client ${clientId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send offer response notification:', error);
        }
    }
    /**
     * Notify vendor when client accepts their response
     */
    async notifyOfferAccepted(offer, vendorId, booking) {
        try {
            const bookingId = this.extractId(booking._id);
            const clientName = offer.client?.firstName || 'Client';
            await notification_service_1.default.createNotification({
                userId: vendorId,
                type: types_1.NotificationType.OFFER_ACCEPTED,
                title: '🎉 Your Response Was Accepted!',
                message: `${clientName} accepted your response to "${offer.title}". Booking created.`,
                relatedBooking: bookingId,
                actionUrl: `/bookings/${booking._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    offerId: offer._id,
                    bookingId: booking._id,
                    clientName,
                    offerTitle: offer.title,
                    finalPrice: booking.totalAmount,
                },
            });
            logger_1.default.info(`Offer accepted notification sent to vendor ${vendorId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send offer accepted notification:', error);
        }
    }
    /**
     * Notify client when vendor makes counter offer
     */
    async notifyCounterOffer(offer, vendorId, newPrice) {
        try {
            const clientId = this.extractId(offer.client);
            const vendor = await User_1.default.findById(vendorId);
            const vendorName = vendor?.vendorProfile?.businessName || vendor?.firstName || 'Vendor';
            if (!clientId)
                return;
            await notification_service_1.default.createNotification({
                userId: clientId,
                type: types_1.NotificationType.OFFER_COUNTER,
                title: '💰 Counter Offer Received',
                message: `${vendorName} countered with ₦${newPrice.toLocaleString()} for "${offer.title}"`,
                actionUrl: `/offers/${offer._id}`,
                channels: {
                    push: true,
                    inApp: true,
                },
                data: {
                    offerId: offer._id,
                    vendorId: vendorId,
                    vendorName,
                    newPrice,
                    originalPrice: offer.proposedPrice,
                },
            });
            logger_1.default.info(`Counter offer notification sent to client ${clientId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send counter offer notification:', error);
        }
    }
    /**
     * Notify about order delivery based on distance
     */
    async notifyOrderDelivery(order, status, estimatedTime) {
        try {
            const customerId = this.extractId(order.customer);
            const orderId = this.extractId(order._id);
            if (!customerId)
                return;
            let title = '';
            let message = '';
            switch (status) {
                case 'shipped':
                    title = '📦 Order Shipped';
                    message = `Your order #${order.orderNumber} has been shipped${estimatedTime ? ` - Estimated delivery: ${estimatedTime}` : ''}`;
                    break;
                case 'out_for_delivery':
                    title = '🚚 Out for Delivery';
                    message = `Your order #${order.orderNumber} is out for delivery${estimatedTime ? ` - Arriving in ${estimatedTime}` : ''}`;
                    break;
                case 'nearby':
                    title = '📍 Delivery Driver Nearby';
                    message = `Your order #${order.orderNumber} is nearby! The driver will arrive shortly.`;
                    break;
            }
            await notification_service_1.default.createNotification({
                userId: customerId,
                type: types_1.NotificationType.ORDER_STATUS_UPDATE,
                title,
                message,
                actionUrl: `/orders/${order._id}`,
                channels: {
                    push: true,
                    email: status === 'shipped',
                    inApp: true,
                },
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    status,
                    estimatedTime,
                    deliveryLocation: order.deliveryAddress,
                },
            });
            logger_1.default.info(`Order delivery notification sent: ${orderId} - ${status}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send order delivery notification:', error);
        }
    }
    /**
     * Notify seller about order from nearby customer
     */
    async notifySellerNewOrder(order, distance) {
        try {
            const sellerId = this.extractId(order.seller);
            if (!sellerId)
                return;
            const distanceText = distance
                ? ` - Customer is ${distance.toFixed(1)}km away`
                : '';
            await notification_service_1.default.createNotification({
                userId: sellerId,
                type: types_1.NotificationType.NEW_ORDER,
                title: '🛍️ New Order Received',
                message: `Order #${order.orderNumber} - ₦${order.totalAmount.toLocaleString()}${distanceText}`,
                actionUrl: `/orders/${order._id}`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    totalAmount: order.totalAmount,
                    distance,
                    customerLocation: order.deliveryAddress,
                },
            });
            logger_1.default.info(`New order notification sent to seller ${sellerId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send new order notification:', error);
        }
    }
    /**
     * Notify customer about distance-based delivery fee
     */
    async notifyDeliveryFeeCalculated(userId, orderId, deliveryFee, distance, estimatedTime) {
        try {
            await notification_service_1.default.createNotification({
                userId,
                type: types_1.NotificationType.ORDER_UPDATE,
                title: '🚗 Delivery Fee Calculated',
                message: `Delivery fee: ₦${deliveryFee.toLocaleString()} for ${distance.toFixed(1)}km - ETA: ${estimatedTime}`,
                actionUrl: `/orders/${orderId}`,
                channels: {
                    inApp: true,
                },
                data: {
                    orderId,
                    deliveryFee,
                    distance,
                    estimatedTime,
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send delivery fee notification:', error);
        }
    }
    // ==================== ADD THESE METHODS TO YOUR notificationHelper.ts ====================
    // Add these methods inside your NotificationHelper class (before the final `}`)
    /**
     * Send notification to a specific user (generic method)
     * Used for custom notifications like cancellation penalties
     */
    async sendNotification(userId, title, message, type, data) {
        try {
            await notification_service_1.default.createNotification({
                userId,
                type: type,
                title,
                message,
                actionUrl: data?.actionUrl || undefined,
                channels: {
                    push: true,
                    inApp: true,
                },
                data,
            });
            logger_1.default.info(`📩 Notification sent to user ${userId}: ${title}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to send notification to user ${userId}:`, error);
        }
    }
    /**
     * Notify all admin users
     * Used for red flags and other admin-relevant events
     */
    async notifyAdmins(title, message, type, data) {
        try {
            // Find all admin users
            const admins = await User_1.default.find({
                role: 'admin',
                isDeleted: { $ne: true },
                status: 'active'
            }).select('_id');
            if (admins.length === 0) {
                logger_1.default.warn('No active admins found to notify');
                return;
            }
            // Send notification to each admin
            const notifications = admins.map(admin => this.sendNotification(admin._id.toString(), title, message, type, data));
            await Promise.all(notifications);
            logger_1.default.info(`📢 Notified ${admins.length} admins: ${title}`);
        }
        catch (error) {
            logger_1.default.error('Failed to notify admins:', error);
        }
    }
    // ==================== END OF METHODS TO ADD ====================
    /**
   * Add this method to your notificationHelper utility
   * This sends a notification when a user successfully funds their wallet
   */
    /**
     * ============================================
     * CORRECTED notifyWalletFunded METHOD
     * ============================================
     *
     * Replace the existing notifyWalletFunded method in your
     * src/utils/notificationHelper.ts with this corrected version.
     *
     * This version:
     * 1. Uses the correct notificationService.createNotification structure
     * 2. Uses extractId helper like other notification methods
     * 3. Follows the same pattern as existing methods (e.g., notifyPaymentSuccessful)
     * 4. Uses NotificationType enum
     * 5. Has proper error handling
     */
    /**
     * Notify user about successful wallet funding
     */
    async notifyWalletFunded(payment, userId, amount) {
        try {
            const paymentId = this.extractId(payment._id);
            await notification_service_1.default.createNotification({
                userId,
                type: types_1.NotificationType.PAYMENT_SUCCESSFUL,
                title: '💰 Wallet Funded Successfully',
                message: `₦${amount.toLocaleString()} has been added to your wallet`,
                relatedPayment: paymentId,
                actionUrl: `/Transactions`,
                channels: {
                    push: true,
                    email: true,
                    inApp: true,
                },
                data: {
                    paymentId: payment._id,
                    reference: payment.reference,
                    amount,
                    fundingType: 'wallet_funding',
                },
            });
            logger_1.default.info(`Wallet funding notification sent to user ${userId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to send wallet funding notification:', error);
        }
    }
    // In your notificationHelper.ts file, add:
    /**
     * Notify user about refund processed
     */
    async notifyRefundProcessed(payment, userId, message) {
        try {
            await notification_service_1.default.createNotification({
                userId,
                type: types_1.NotificationType.PAYMENT_REFUNDED,
                title: 'Refund Processed',
                message: `₦${payment.amount.toLocaleString()} has been refunded to your wallet. ${message}`,
                data: {
                    paymentId: payment._id.toString(),
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending refund notification:', error);
        }
    }
    // In notificationHelper.ts
    async notifySellerPaymentReleased(order, amount, platformFee, newBalance) {
        await notification_service_1.default.createNotification({
            userId: order.seller.toString(),
            type: types_1.NotificationType.PAYMENT_RECEIVED,
            title: 'Payment Released',
            message: `₦${amount.toLocaleString()} has been released to your wallet for order #${order.orderNumber}`,
            data: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                amount,
                platformFee,
                newBalance,
            },
        });
    }
    async notifyOrderRefundProcessed(order, amount, newBalance, message) {
        await notification_service_1.default.createNotification({
            userId: order.customer.toString(),
            type: types_1.NotificationType.PAYMENT_REFUNDED,
            title: 'Refund Processed',
            message: `₦${amount.toLocaleString()} has been refunded for order #${order.orderNumber}. ${message}`,
            data: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                amount,
                newBalance,
            },
        });
    }
    async notifyOrderCancelled(order, cancelledBy, reason) {
        const recipientId = cancelledBy === 'customer' ? order.seller : order.customer;
        const cancellerRole = cancelledBy === 'customer' ? 'Customer' : 'Seller';
        await notification_service_1.default.createNotification({
            userId: recipientId.toString(),
            type: types_1.NotificationType.ORDER_CANCELLED,
            title: 'Order Cancelled',
            message: `Order #${order.orderNumber} was cancelled by ${cancellerRole.toLowerCase()}${reason ? `: ${reason}` : ''}`,
            data: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                cancelledBy,
                reason,
            },
        });
    }
}
exports.default = new NotificationHelper();
//# sourceMappingURL=notificationHelper.js.map