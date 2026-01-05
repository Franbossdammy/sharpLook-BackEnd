import mongoose, { Document, Model } from 'mongoose';
export interface IService extends Document {
    _id: mongoose.Types.ObjectId;
    vendor: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description: string;
    category: mongoose.Types.ObjectId;
    subCategory?: mongoose.Types.ObjectId;
    basePrice: number;
    priceType: 'fixed' | 'hourly' | 'negotiable';
    duration?: number;
    images: string[];
    isActive: boolean;
    tags: string[];
    requirements?: string[];
    whatIsIncluded?: string[];
    faqs?: {
        question: string;
        answer: string;
    }[];
    availability?: {
        monday: boolean;
        tuesday: boolean;
        wednesday: boolean;
        thursday: boolean;
        friday: boolean;
        saturday: boolean;
        sunday: boolean;
    };
    metadata?: {
        views: number;
        bookings: number;
        completedBookings: number;
        averageRating: number;
        totalReviews: number;
    };
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    approvalNotes?: string;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectionReason?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Service: Model<IService>;
export default Service;
//# sourceMappingURL=Service.d.ts.map