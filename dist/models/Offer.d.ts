import mongoose, { Document, Model } from 'mongoose';
export interface IOffer extends Document {
    _id: mongoose.Types.ObjectId;
    client: mongoose.Types.ObjectId;
    service?: mongoose.Types.ObjectId;
    category: mongoose.Types.ObjectId;
    title: string;
    description: string;
    proposedPrice: number;
    location: {
        type: string;
        coordinates: [number, number];
        address: string;
        city: string;
        state: string;
    };
    preferredDate?: Date;
    preferredTime?: string;
    flexibility: 'flexible' | 'specific' | 'urgent';
    status: 'open' | 'closed' | 'accepted' | 'expired';
    expiresAt: Date;
    responses: {
        vendor: mongoose.Types.ObjectId;
        proposedPrice: number;
        counterOffer?: number;
        message?: string;
        estimatedDuration?: number;
        respondedAt: Date;
        isAccepted: boolean;
        acceptedAt?: Date;
    }[];
    selectedVendor?: mongoose.Types.ObjectId;
    selectedResponse?: mongoose.Types.ObjectId;
    acceptedAt?: Date;
    bookingId?: mongoose.Types.ObjectId;
    images?: string[];
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Offer: Model<IOffer>;
export default Offer;
//# sourceMappingURL=Offer.d.ts.map