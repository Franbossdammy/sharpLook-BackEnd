import mongoose, { Document, Model } from 'mongoose';
import { NotificationType } from '../types';
export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    relatedBooking?: mongoose.Types.ObjectId;
    relatedPayment?: mongoose.Types.ObjectId;
    relatedDispute?: mongoose.Types.ObjectId;
    relatedReview?: mongoose.Types.ObjectId;
    relatedMessage?: mongoose.Types.ObjectId;
    actionUrl?: string;
    isRead: boolean;
    readAt?: Date;
    isSent: boolean;
    sentAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    channels: {
        push: boolean;
        email: boolean;
        sms: boolean;
        inApp: boolean;
    };
    data?: any;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Notification: Model<INotification>;
export default Notification;
//# sourceMappingURL=Notification.d.ts.map