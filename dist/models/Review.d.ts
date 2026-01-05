import mongoose, { Document, Model } from 'mongoose';
export interface IReview extends Document {
    _id: mongoose.Types.ObjectId;
    booking: mongoose.Types.ObjectId;
    reviewer: mongoose.Types.ObjectId;
    reviewee: mongoose.Types.ObjectId;
    reviewerType: 'client' | 'vendor';
    rating: number;
    title?: string;
    comment: string;
    detailedRatings?: {
        serviceQuality?: number;
        communication?: number;
        punctuality?: number;
        professionalism?: number;
        valueForMoney?: number;
    };
    images?: string[];
    response?: {
        comment: string;
        respondedAt: Date;
    };
    helpfulCount: number;
    notHelpfulCount: number;
    helpfulVotes: mongoose.Types.ObjectId[];
    isApproved: boolean;
    isFlagged: boolean;
    flagReason?: string;
    flaggedBy?: mongoose.Types.ObjectId;
    flaggedAt?: Date;
    moderatedBy?: mongoose.Types.ObjectId;
    moderatedAt?: Date;
    moderationNotes?: string;
    isHidden: boolean;
    hiddenReason?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Review: Model<IReview>;
export default Review;
//# sourceMappingURL=Review.d.ts.map