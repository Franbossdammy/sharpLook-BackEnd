import mongoose, { Document, Model } from 'mongoose';
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    OUT_FOR_DELIVERY = "out_for_delivery",
    DELIVERED = "delivered",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    DISPUTED = "disputed"
}
export declare enum DeliveryType {
    HOME_DELIVERY = "home_delivery",
    PICKUP = "pickup"
}
export declare enum PaymentMethod {
    CARD = "card",
    BANK_TRANSFER = "bank_transfer",
    WALLET = "wallet",
    USSD = "ussd"
}
export interface IOrderItem {
    product: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    selectedVariant?: {
        name: string;
        option: string;
    };
    subtotal: number;
}
export interface IDeliveryAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode?: string;
    additionalInfo?: string;
    coordinates?: [number, number];
}
export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId;
    orderNumber: string;
    customer: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    sellerType: 'vendor' | 'admin';
    items: IOrderItem[];
    subtotal: number;
    deliveryFee: number;
    discount?: number;
    totalAmount: number;
    deliveryType: DeliveryType;
    deliveryAddress?: IDeliveryAddress;
    pickupLocation?: {
        address: string;
        city: string;
        state: string;
        phone: string;
    };
    estimatedDeliveryDate?: Date;
    actualDeliveryDate?: Date;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    payment: mongoose.Types.ObjectId;
    isPaid: boolean;
    paidAt?: Date;
    escrowStatus: 'pending' | 'locked' | 'released' | 'refunded';
    escrowedAmount: number;
    escrowedAt?: Date;
    escrowReleaseDate?: Date;
    status: OrderStatus;
    statusHistory: {
        status: OrderStatus;
        note?: string;
        updatedBy: mongoose.Types.ObjectId;
        updatedAt: Date;
    }[];
    customerConfirmedDelivery: boolean;
    customerConfirmedAt?: Date;
    sellerConfirmedDelivery: boolean;
    sellerConfirmedAt?: Date;
    isRated: boolean;
    rating?: number;
    review?: mongoose.Types.ObjectId;
    hasDispute: boolean;
    dispute?: mongoose.Types.ObjectId;
    disputeReason?: string;
    disputeOpenedAt?: Date;
    cancellationReason?: string;
    cancelledBy?: mongoose.Types.ObjectId;
    cancelledAt?: Date;
    customerNotes?: string;
    sellerNotes?: string;
    adminNotes?: string;
    trackingNumber?: string;
    courierService?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    canBeDelivered(): boolean;
    canBeCompleted(): boolean;
    canBeCancelled(): boolean;
    canBeDisputed(): boolean;
    addStatusUpdate(status: OrderStatus, userId: string, note?: string): Promise<void>;
}
declare const Order: Model<IOrder>;
export default Order;
//# sourceMappingURL=Order.d.ts.map