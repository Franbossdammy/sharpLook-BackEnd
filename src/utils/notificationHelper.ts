import notificationService from '../services/notification.service';
import { NotificationType } from '../types';
import logger from '../utils/logger';
import User from '../models/User';


class NotificationHelper {
  /**
   * Extract ObjectId string from object or string
   * @returns string or undefined (never null)
   */
  private extractId(value: any): string | undefined {
    if (!value) return undefined;
    
    if (typeof value === 'string') return value;
    
    if (value._id) {
      return typeof value._id === 'string' 
        ? value._id 
        : value._id.toString();
    }
    
    if (value.toString && typeof value.toString === 'function') {
      try {
        return value.toString();
      } catch {
        return undefined;
      }
    }
    
    return undefined;
  }

  /**
   * Send booking created notification to BOTH client and vendor
   */
  public async notifyBookingCreated(booking: any): Promise<void> {
    try {
      const vendorId = this.extractId(booking.vendor);
      const clientId = this.extractId(booking.client);
      const bookingId = this.extractId(booking._id);

      // Notify Vendor - New booking request
      if (vendorId) {
        await notificationService.createNotification({
          userId: vendorId,
          type: NotificationType.BOOKING_CREATED,
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
        await notificationService.createNotification({
          userId: clientId,
          type: NotificationType.BOOKING_CREATED,
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

      logger.info(`Booking created notifications sent for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send booking created notification:', error);
    }
  }

  /**
   * Send booking accepted notification to BOTH client and vendor
   */
  public async notifyBookingAccepted(booking: any): Promise<void> {
    try {
      const clientId = this.extractId(booking.client);
      const vendorId = this.extractId(booking.vendor);
      const bookingId = this.extractId(booking._id);

      // Notify Client - Booking accepted
      if (clientId) {
        await notificationService.createNotification({
          userId: clientId,
          type: NotificationType.BOOKING_CONFIRMED,
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
        await notificationService.createNotification({
          userId: vendorId,
          type: NotificationType.BOOKING_CONFIRMED,
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

      logger.info(`Booking accepted notifications sent for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send booking accepted notification:', error);
    }
  }

  /**
   * Send booking rejected notification to BOTH client and vendor
   */
  public async notifyBookingRejected(booking: any, reason?: string): Promise<void> {
    try {
      const clientId = this.extractId(booking.client);
      const vendorId = this.extractId(booking.vendor);
      const bookingId = this.extractId(booking._id);

      // Notify Client - Booking rejected
      if (clientId) {
        await notificationService.createNotification({
          userId: clientId,
          type: NotificationType.BOOKING_CANCELLED,
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
        await notificationService.createNotification({
          userId: vendorId,
          type: NotificationType.BOOKING_CANCELLED,
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

      logger.info(`Booking rejected notifications sent for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send booking rejected notification:', error);
    }
  }

  /**
   * Send booking started notification to BOTH client and vendor
   */
  public async notifyBookingStarted(booking: any): Promise<void> {
    try {
      const clientId = this.extractId(booking.client);
      const vendorId = this.extractId(booking.vendor);
      const bookingId = this.extractId(booking._id);

      // Notify Client - Service started
      if (clientId) {
        await notificationService.createNotification({
          userId: clientId,
          type: NotificationType.BOOKING_STARTED,
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
        await notificationService.createNotification({
          userId: vendorId,
          type: NotificationType.BOOKING_STARTED,
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

      logger.info(`Booking started notifications sent for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send booking started notification:', error);
    }
  }

  /**
   * Send partial completion notification (when one party marks complete)
   */
  public async notifyPartialCompletion(
    booking: any,
    recipient: 'vendor' | 'client',
    completedBy: 'vendor' | 'client'
  ): Promise<void> {
    try {
      const recipientId = recipient === 'client' 
        ? this.extractId(booking.client)
        : this.extractId(booking.vendor);
      const bookingId = this.extractId(booking._id);

      if (!recipientId) {
        logger.error(`${recipient} ID not found in booking`);
        return;
      }

      const message = completedBy === 'client'
        ? 'The client has marked this booking as complete. Please confirm completion to receive payment.'
        : 'The vendor has marked this service as complete. Please confirm if you are satisfied.';

      const title = completedBy === 'client'
        ? 'Client Confirmed Completion'
        : 'Vendor Marked Complete';

      await notificationService.createNotification({
        userId: recipientId,
        type: NotificationType.BOOKING_COMPLETED,
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

      logger.info(`Partial completion notification sent to ${recipient} for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send partial completion notification:', error);
    }
  }

  /**
   * Send booking completed notification to BOTH client and vendor
   */
  public async notifyBookingCompleted(booking: any, recipientId: string, role: 'client' | 'vendor'): Promise<void> {
    try {
      const bookingId = this.extractId(booking._id);

      const message = role === 'client' 
        ? 'Your service has been completed successfully. Please leave a review!'
        : `Payment of ₦${booking.totalAmount?.toLocaleString()} has been released to your wallet.`;

      await notificationService.createNotification({
        userId: recipientId,
        type: NotificationType.BOOKING_COMPLETED,
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

      logger.info(`Booking completed notification sent to ${role} for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send booking completed notification:', error);
    }
  }

  /**
   * Send booking cancelled notification to BOTH parties
   */
  public async notifyBookingCancelled(
    booking: any,
    cancelledBy: 'client' | 'vendor',
    reason?: string
  ): Promise<void> {
    try {
      const clientId = this.extractId(booking.client);
      const vendorId = this.extractId(booking.vendor);
      const bookingId = this.extractId(booking._id);

      if (cancelledBy === 'client') {
        // Notify Vendor - Client cancelled
        if (vendorId) {
          await notificationService.createNotification({
            userId: vendorId,
            type: NotificationType.BOOKING_CANCELLED,
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
          await notificationService.createNotification({
            userId: clientId,
            type: NotificationType.BOOKING_CANCELLED,
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
      } else {
        // Notify Client - Vendor cancelled
        if (clientId) {
          await notificationService.createNotification({
            userId: clientId,
            type: NotificationType.BOOKING_CANCELLED,
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
          await notificationService.createNotification({
            userId: vendorId,
            type: NotificationType.BOOKING_CANCELLED,
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

      logger.info(`Booking cancelled notifications sent for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send booking cancelled notification:', error);
    }
  }

  /**
   * Send booking reminder notification
   */
  public async notifyBookingReminder(booking: any, recipientId: string, hoursUntil: number): Promise<void> {
    try {
      const bookingId = this.extractId(booking._id);

      await notificationService.createNotification({
        userId: recipientId,
        type: NotificationType.BOOKING_REMINDER,
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

      logger.info(`Booking reminder notification sent for booking ${booking._id}`);
    } catch (error) {
      logger.error('Failed to send booking reminder notification:', error);
    }
  }

  /**
   * Send payment received notification to vendor
   */
  public async notifyPaymentReceived(payment: any, vendorId: string): Promise<void> {
    try {
      const paymentId = this.extractId(payment._id);
      const bookingId = this.extractId(payment.booking);

      await notificationService.createNotification({
        userId: vendorId,
        type: NotificationType.PAYMENT_RECEIVED,
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

      logger.info(`Payment received notification sent for payment ${payment._id}`);
    } catch (error) {
      logger.error('Failed to send payment received notification:', error);
    }
  }

  /**
   * Send payment successful notification to client
   */
  public async notifyPaymentSuccessful(payment: any, clientId: string): Promise<void> {
    try {
      const paymentId = this.extractId(payment._id);
      const bookingId = this.extractId(payment.booking);

      await notificationService.createNotification({
        userId: clientId,
        type: NotificationType.PAYMENT_SUCCESSFUL,
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

      logger.info(`Payment successful notification sent for payment ${payment._id}`);
    } catch (error) {
      logger.error('Failed to send payment successful notification:', error);
    }
  }

  /**
   * Send payment failed notification
   */
  public async notifyPaymentFailed(payment: any, userId: string, reason?: string): Promise<void> {
    try {
      const paymentId = this.extractId(payment._id);
      const bookingId = this.extractId(payment.booking);

      await notificationService.createNotification({
        userId,
        type: NotificationType.PAYMENT_FAILED,
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

      logger.info(`Payment failed notification sent for payment ${payment._id}`);
    } catch (error) {
      logger.error('Failed to send payment failed notification:', error);
    }
  }

  /**
   * Send payment refund notification
   */
  public async notifyPaymentRefunded(payment: any, userId: string): Promise<void> {
    try {
      const paymentId = this.extractId(payment._id);
      const bookingId = this.extractId(payment.booking);

      await notificationService.createNotification({
        userId,
        type: NotificationType.PAYMENT_REFUNDED,
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

      logger.info(`Payment refund notification sent for payment ${payment._id}`);
    } catch (error) {
      logger.error('Failed to send payment refund notification:', error);
    }
  }

  /**
   * Send new message notification
   */
  public async notifyNewMessage(message: any, recipientId: string, senderName: string): Promise<void> {
    try {
      const messageId = this.extractId(message._id);

      await notificationService.createNotification({
        userId: recipientId,
        type: NotificationType.NEW_MESSAGE,
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

      logger.info(`New message notification sent for message ${message._id}`);
    } catch (error) {
      logger.error('Failed to send new message notification:', error);
    }
  }

  /**
   * Send new review notification to vendor
   */
  public async notifyNewReview(review: any, vendorId: string): Promise<void> {
    try {
      const reviewId = this.extractId(review._id);
      const bookingId = this.extractId(review.booking);

      await notificationService.createNotification({
        userId: vendorId,
        type: NotificationType.NEW_REVIEW,
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

      logger.info(`New review notification sent for review ${review._id}`);
    } catch (error) {
      logger.error('Failed to send new review notification:', error);
    }
  }

  /**
   * Send review response notification to client
   */
  public async notifyReviewResponse(review: any, clientId: string, vendorName: string): Promise<void> {
    try {
      const reviewId = this.extractId(review._id);

      await notificationService.createNotification({
        userId: clientId,
        type: NotificationType.REVIEW_RESPONSE,
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

      logger.info(`Review response notification sent for review ${review._id}`);
    } catch (error) {
      logger.error('Failed to send review response notification:', error);
    }
  }

  /**
   * Send dispute created notification
   */
  public async notifyDisputeCreated(dispute: any, respondentId: string, initiatorName: string): Promise<void> {
    try {
      const disputeId = this.extractId(dispute._id);
      const bookingId = this.extractId(dispute.booking?._id || dispute.booking);

      await notificationService.createNotification({
        userId: respondentId,
        type: NotificationType.DISPUTE_CREATED,
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

      logger.info(`Dispute created notification sent for dispute ${dispute._id}`);
    } catch (error) {
      logger.error('Failed to send dispute created notification:', error);
    }
  }

  /**
   * Send dispute updated notification
   */
  public async notifyDisputeUpdated(dispute: any, recipientId: string): Promise<void> {
    try {
      const disputeId = this.extractId(dispute._id);

      await notificationService.createNotification({
        userId: recipientId,
        type: NotificationType.DISPUTE_UPDATED,
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

      logger.info(`Dispute updated notification sent for dispute ${dispute._id}`);
    } catch (error) {
      logger.error('Failed to send dispute updated notification:', error);
    }
  }

  /**
   * Send dispute resolved notification
   */
  public async notifyDisputeResolved(dispute: any, recipientId: string): Promise<void> {
    try {
      const disputeId = this.extractId(dispute._id);

      await notificationService.createNotification({
        userId: recipientId,
        type: NotificationType.DISPUTE_RESOLVED,
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

      logger.info(`Dispute resolved notification sent for dispute ${dispute._id}`);
    } catch (error) {
      logger.error('Failed to send dispute resolved notification:', error);
    }
  }

  /**
   * Send withdrawal approved notification
   */
  public async notifyWithdrawalApproved(withdrawal: any, vendorId: string): Promise<void> {
    try {
      await notificationService.createNotification({
        userId: vendorId,
        type: NotificationType.WITHDRAWAL_APPROVED,
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

      logger.info(`Withdrawal approved notification sent for withdrawal ${withdrawal._id}`);
    } catch (error) {
      logger.error('Failed to send withdrawal approved notification:', error);
    }
  }

  /**
   * Send withdrawal rejected notification
   */
  public async notifyWithdrawalRejected(withdrawal: any, vendorId: string, reason?: string): Promise<void> {
    try {
      await notificationService.createNotification({
        userId: vendorId,
        type: NotificationType.WITHDRAWAL_REJECTED,
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

      logger.info(`Withdrawal rejected notification sent for withdrawal ${withdrawal._id}`);
    } catch (error) {
      logger.error('Failed to send withdrawal rejected notification:', error);
    }
  }

  /**
   * Notify user about wallet credited (deposit successful)
   */
  public async notifyWalletCredited(
    transaction: any,
    userId: string
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId,
        type: NotificationType.PAYMENT_SUCCESSFUL,
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

      logger.info(`Wallet credit notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send wallet credit notification:', error);
    }
  }

  /**
   * Notify user about withdrawal completed
   */
  public async notifyWithdrawalCompleted(
    withdrawal: any,
    userId: string
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId,
        type: NotificationType.WITHDRAWAL_APPROVED,
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

      logger.info(`Withdrawal completed notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send withdrawal completed notification:', error);
    }
  }

  /**
   * Send promotional notification
   */
  public async notifyPromotion(
    userIds: string[],
    title: string,
    message: string,
    actionUrl?: string,
    _data?: any
  ): Promise<void> {
    try {
      await notificationService.sendBulkNotifications(userIds, {
        type: NotificationType.PROMOTIONAL,
        title,
        message,
        actionUrl,
        channels: {
          push: true,
          email: true,
          inApp: true,
        },
      });

      logger.info(`Promotional notification sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Failed to send promotional notification:', error);
    }
  }

  /**
   * Send system announcement
   */
  public async notifySystemAnnouncement(
    userIds: string[],
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      await notificationService.sendBulkNotifications(userIds, {
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title,
        message,
        actionUrl,
        channels: {
          push: true,
          email: true,
          inApp: true,
        },
      });

      logger.info(`System announcement sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Failed to send system announcement:', error);
    }
  }

  /**
   * Notify vendors about new offer in their service area
   */
  public async notifyVendorsAboutNewOffer(
    offer: any,
    nearbyVendorIds: string[]
  ): Promise<void> {
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
        logger.info('No nearby vendors to notify');
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
        type: NotificationType.NEW_OFFER_NEARBY,
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
      await notificationService.sendBulkNotifications(nearbyVendorIds, notificationData);

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ [NOTIFY VENDORS ABOUT NEW OFFER] COMPLETE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📊 Summary: Notified ${nearbyVendorIds.length} vendors about offer ${offerId}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      logger.info(`Notified ${nearbyVendorIds.length} vendors about offer ${offerId}`);
    } catch (error: any) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('❌ [NOTIFY VENDORS ABOUT NEW OFFER] ERROR');
      console.log('═══════════════════════════════════════════════════════════');
      console.error('Error details:');
      console.error('  - Message:', error.message);
      console.error('  - Stack:', error.stack);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      
      logger.error('Failed to notify vendors about new offer:', error);
    }
  }

  /**
   * Notify client when vendor responds to offer
   */
  public async notifyOfferResponse(
    offer: any,
    vendorId: string,
    response: any
  ): Promise<void> {
    try {
      const clientId = this.extractId(offer.client);
      const vendor = response.vendor || (await User.findById(vendorId));

      if (!clientId) {
        logger.error('Client ID not found in offer');
        return;
      }

      const vendorName = vendor?.vendorProfile?.businessName || vendor?.firstName || 'A vendor';

      await notificationService.createNotification({
        userId: clientId,
        type: NotificationType.OFFER_RESPONSE,
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

      logger.info(`Offer response notification sent to client ${clientId}`);
    } catch (error) {
      logger.error('Failed to send offer response notification:', error);
    }
  }

  /**
   * Notify vendor when client accepts their response
   */
  public async notifyOfferAccepted(
    offer: any,
    vendorId: string,
    booking: any
  ): Promise<void> {
    try {
      const bookingId = this.extractId(booking._id);
      const clientName = offer.client?.firstName || 'Client';

      await notificationService.createNotification({
        userId: vendorId,
        type: NotificationType.OFFER_ACCEPTED,
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

      logger.info(`Offer accepted notification sent to vendor ${vendorId}`);
    } catch (error) {
      logger.error('Failed to send offer accepted notification:', error);
    }
  }

  /**
   * Notify client when vendor makes counter offer
   */
  public async notifyCounterOffer(
    offer: any,
    vendorId: string,
    newPrice: number
  ): Promise<void> {
    try {
      const clientId = this.extractId(offer.client);
      const vendor = await User.findById(vendorId);
      const vendorName = vendor?.vendorProfile?.businessName || vendor?.firstName || 'Vendor';

      if (!clientId) return;

      await notificationService.createNotification({
        userId: clientId,
        type: NotificationType.OFFER_COUNTER,
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

      logger.info(`Counter offer notification sent to client ${clientId}`);
    } catch (error) {
      logger.error('Failed to send counter offer notification:', error);
    }
  }

  /**
   * Notify about order delivery based on distance
   */
  public async notifyOrderDelivery(
    order: any,
    status: 'shipped' | 'out_for_delivery' | 'nearby',
    estimatedTime?: string
  ): Promise<void> {
    try {
      const customerId = this.extractId(order.customer);
      const orderId = this.extractId(order._id);

      if (!customerId) return;

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

      await notificationService.createNotification({
        userId: customerId,
        type: NotificationType.ORDER_STATUS_UPDATE,
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

      logger.info(`Order delivery notification sent: ${orderId} - ${status}`);
    } catch (error) {
      logger.error('Failed to send order delivery notification:', error);
    }
  }

  /**
   * Notify seller about order from nearby customer
   */
  public async notifySellerNewOrder(
    order: any,
    distance?: number
  ): Promise<void> {
    try {
      const sellerId = this.extractId(order.seller);

      if (!sellerId) return;

      const distanceText = distance 
        ? ` - Customer is ${distance.toFixed(1)}km away`
        : '';

      await notificationService.createNotification({
        userId: sellerId,
        type: NotificationType.NEW_ORDER,
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

      logger.info(`New order notification sent to seller ${sellerId}`);
    } catch (error) {
      logger.error('Failed to send new order notification:', error);
    }
  }

  /**
   * Notify customer about distance-based delivery fee
   */
  public async notifyDeliveryFeeCalculated(
    userId: string,
    orderId: string,
    deliveryFee: number,
    distance: number,
    estimatedTime: string
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId,
        type: NotificationType.ORDER_UPDATE,
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
    } catch (error) {
      logger.error('Failed to send delivery fee notification:', error);
    }
  }

  // ==================== ADD THESE METHODS TO YOUR notificationHelper.ts ====================
// Add these methods inside your NotificationHelper class (before the final `}`)

  /**
   * Send notification to a specific user (generic method)
   * Used for custom notifications like cancellation penalties
   */
  public async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId,
        type: type as NotificationType,
        title,
        message,
        actionUrl: data?.actionUrl || undefined,
        channels: {
          push: true,
          inApp: true,
        },
        data,
      });

      logger.info(`📩 Notification sent to user ${userId}: ${title}`);
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
    }
  }

  /**
   * Notify all admin users
   * Used for red flags and other admin-relevant events
   */
  public async notifyAdmins(
    title: string,
    message: string,
    type: string,
    data?: any
  ): Promise<void> {
    try {
      // Find all admin users
      const admins = await User.find({ 
        role: 'admin', 
        isDeleted: { $ne: true },
        status: 'active'
      }).select('_id');

      if (admins.length === 0) {
        logger.warn('No active admins found to notify');
        return;
      }

      // Send notification to each admin
      const notifications = admins.map(admin => 
        this.sendNotification(
          admin._id.toString(),
          title,
          message,
          type,
          data
        )
      );

      await Promise.all(notifications);

      logger.info(`📢 Notified ${admins.length} admins: ${title}`);
    } catch (error) {
      logger.error('Failed to notify admins:', error);
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
public async notifyWalletFunded(
  payment: any,
  userId: string,
  amount: number
): Promise<void> {
  try {
    const paymentId = this.extractId(payment._id);

    await notificationService.createNotification({
      userId,
      type: NotificationType.PAYMENT_SUCCESSFUL,
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

    logger.info(`Wallet funding notification sent to user ${userId}`);
  } catch (error) {
    logger.error('Failed to send wallet funding notification:', error);
  }
}

// In your notificationHelper.ts file, add:

/**
 * Notify user about refund processed
 */
async notifyRefundProcessed(
  payment: any,
  userId: string,
  message: string
): Promise<void> {
  try {
    await notificationService.createNotification({
      userId,
      type: NotificationType.PAYMENT_REFUNDED,
      title: 'Refund Processed',
      message: `₦${payment.amount.toLocaleString()} has been refunded to your wallet. ${message}`,
      data: {
        paymentId: payment._id.toString(),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
      },
    });
  } catch (error) {
    logger.error('Error sending refund notification:', error);
  }
}

// In notificationHelper.ts

async notifySellerPaymentReleased(
  order: any,
  amount: number,
  platformFee: number,
  newBalance: number
): Promise<void> {
  await notificationService.createNotification({
    userId: order.seller.toString(),
    type: NotificationType.PAYMENT_RECEIVED,
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

async notifyOrderRefundProcessed(
  order: any,
  amount: number,
  newBalance: number,
  message: string
): Promise<void> {
  await notificationService.createNotification({
    userId: order.customer.toString(),
    type: NotificationType.PAYMENT_REFUNDED,
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

async notifyOrderCancelled(
  order: any,
  cancelledBy: 'customer' | 'seller',
  reason?: string
): Promise<void> {
  const recipientId = cancelledBy === 'customer' ? order.seller : order.customer;
  const cancellerRole = cancelledBy === 'customer' ? 'Customer' : 'Seller';
  
  await notificationService.createNotification({
    userId: recipientId.toString(),
    type: NotificationType.ORDER_CANCELLED,
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

export default new NotificationHelper();