import mongoose, { Document, Model } from 'mongoose';
import { BookingStatus, BookingType } from '../types';
export interface IBooking extends Document {
    _id: mongoose.Types.ObjectId;
    bookingType: BookingType;
    client: mongoose.Types.ObjectId;
    vendor: mongoose.Types.ObjectId;
    service: mongoose.Types.ObjectId;
    offer?: mongoose.Types.ObjectId;
    scheduledDate: Date;
    scheduledTime?: string;
    duration?: number;
    location?: {
        type: string;
        coordinates: [number, number];
        address: string;
        city: string;
        state: string;
    };
    servicePrice: number;
    distanceCharge: number;
    totalAmount: number;
    status: BookingStatus;
    statusHistory: {
        status: BookingStatus;
        changedAt: Date;
        changedBy: mongoose.Types.ObjectId;
        reason?: string;
    }[];
    clientNotes?: string;
    vendorNotes?: string;
    completedAt?: Date;
    completedBy?: 'client' | 'vendor' | 'both';
    clientMarkedComplete: boolean;
    vendorMarkedComplete: boolean;
    paymentId?: mongoose.Types.ObjectId;
    paymentStatus: 'pending' | 'escrowed' | 'released' | 'refunded' | 'partially_refunded';
    paymentReference?: string;
    paymentExpiresAt?: Date;
    cancellationPenalty?: number;
    cancelledAt?: Date;
    cancelledBy?: mongoose.Types.ObjectId;
    cancellationReason?: string;
    hasDispute: boolean;
    disputeId?: mongoose.Types.ObjectId;
    hasReview: boolean;
    reviewId?: mongoose.Types.ObjectId;
    acceptedAt?: Date;
    rejectedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Booking: Model<IBooking>;
export default Booking;
//# sourceMappingURL=Booking.d.ts.map