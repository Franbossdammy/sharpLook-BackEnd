import mongoose, { Document, Model } from 'mongoose';
export declare enum ProductStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    OUT_OF_STOCK = "out_of_stock",
    DISCONTINUED = "discontinued"
}
export declare enum ProductCondition {
    NEW = "new",
    REFURBISHED = "refurbished",
    USED = "used"
}
export interface IProductVariant {
    name: string;
    options: string[];
    priceModifier?: number;
}
export interface IProduct extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    shortDescription?: string;
    seller: mongoose.Types.ObjectId;
    sellerType: 'vendor' | 'admin';
    category: mongoose.Types.ObjectId;
    subCategory?: mongoose.Types.ObjectId;
    tags?: string[];
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    discount?: {
        type: 'percentage' | 'fixed';
        value: number;
        startDate?: Date;
        endDate?: Date;
    };
    stock: number;
    lowStockThreshold: number;
    sku?: string;
    barcode?: string;
    images: string[];
    condition: ProductCondition;
    brand?: string;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: 'cm' | 'inch';
    };
    variants?: IProductVariant[];
    deliveryOptions: {
        homeDelivery: boolean;
        pickup: boolean;
        freeDelivery?: boolean;
        deliveryFee?: number;
        estimatedDeliveryDays?: number;
        deliveryPricing?: {
            baseDistanceKm?: number;
            baseFee?: number;
            pricePerKm?: number;
            maxDeliveryDistance?: number;
        };
    };
    deliveryPricing?: {
        baseDistanceKm: {
            type: Number;
            default: 5;
        };
        baseFee: {
            type: Number;
            default: 0;
        };
        pricePerKm: {
            type: Number;
            default: 100;
        };
        maxDeliveryDistance: {
            type: Number;
            default: 50;
        };
    };
    location?: {
        type: string;
        coordinates: [number, number];
        address: string;
        city: string;
        state: string;
        country: string;
    };
    status: ProductStatus;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    isFeatured: boolean;
    featuredUntil?: Date;
    featuredBy?: mongoose.Types.ObjectId;
    isSponsored: boolean;
    sponsoredUntil?: Date;
    sponsoredBy?: mongoose.Types.ObjectId;
    sponsorshipAmount?: number;
    views: number;
    orders: number;
    revenue: number;
    rating?: number;
    totalRatings?: number;
    metaTitle?: string;
    metaDescription?: string;
    slug: string;
    isActive: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    calculateFinalPrice(): number;
    isInStock(): boolean;
    isDiscountActive(): boolean;
    decrementStock(quantity: number): Promise<void>;
    incrementStock(quantity: number): Promise<void>;
}
declare const Product: Model<IProduct>;
export default Product;
//# sourceMappingURL=Product.d.ts.map