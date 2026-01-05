"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.DeliveryType = exports.OrderStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["SHIPPED"] = "shipped";
    OrderStatus["OUT_FOR_DELIVERY"] = "out_for_delivery";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["DISPUTED"] = "disputed";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var DeliveryType;
(function (DeliveryType) {
    DeliveryType["HOME_DELIVERY"] = "home_delivery";
    DeliveryType["PICKUP"] = "pickup";
})(DeliveryType || (exports.DeliveryType = DeliveryType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "card";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["WALLET"] = "wallet";
    PaymentMethod["USSD"] = "ussd";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
const orderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Customer is required'],
        index: true,
    },
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Seller is required'],
        index: true,
    },
    sellerType: {
        type: String,
        enum: ['vendor', 'admin'],
        required: true,
    },
    items: [
        {
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            price: {
                type: Number,
                required: true,
                min: [0, 'Price cannot be negative'],
            },
            quantity: {
                type: Number,
                required: true,
                min: [1, 'Quantity must be at least 1'],
            },
            selectedVariant: {
                name: String,
                option: String,
            },
            subtotal: {
                type: Number,
                required: true,
                min: [0, 'Subtotal cannot be negative'],
            },
        },
    ],
    subtotal: {
        type: Number,
        required: true,
        min: [0, 'Subtotal cannot be negative'],
    },
    deliveryFee: {
        type: Number,
        default: 0,
        min: [0, 'Delivery fee cannot be negative'],
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative'],
    },
    deliveryType: {
        type: String,
        enum: Object.values(DeliveryType),
        required: [true, 'Delivery type is required'],
    },
    deliveryAddress: {
        fullName: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
        additionalInfo: String,
        coordinates: {
            type: [Number],
            required: false,
        }
    },
    pickupLocation: {
        address: String,
        city: String,
        state: String,
        phone: String,
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: [true, 'Payment method is required'],
    },
    paymentReference: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    payment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Payment',
    },
    isPaid: {
        type: Boolean,
        default: false,
        index: true,
    },
    paidAt: Date,
    escrowStatus: {
        type: String,
        enum: ['pending', 'locked', 'released', 'refunded'],
        default: 'pending',
        index: true,
    },
    escrowedAmount: {
        type: Number,
        required: true,
        min: [0, 'Escrowed amount cannot be negative'],
    },
    escrowedAt: Date,
    escrowReleaseDate: Date,
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.PENDING,
        index: true,
    },
    statusHistory: [
        {
            status: {
                type: String,
                enum: Object.values(OrderStatus),
                required: true,
            },
            note: String,
            updatedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            updatedAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    customerConfirmedDelivery: {
        type: Boolean,
        default: false,
    },
    customerConfirmedAt: Date,
    sellerConfirmedDelivery: {
        type: Boolean,
        default: false,
    },
    sellerConfirmedAt: Date,
    isRated: {
        type: Boolean,
        default: false,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    review: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Review',
    },
    hasDispute: {
        type: Boolean,
        default: false,
        index: true,
    },
    dispute: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Dispute',
    },
    disputeReason: String,
    disputeOpenedAt: Date,
    cancellationReason: String,
    cancelledBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    cancelledAt: Date,
    customerNotes: String,
    sellerNotes: String,
    adminNotes: String,
    trackingNumber: String,
    courierService: String,
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: Date,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ paymentReference: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ escrowStatus: 1 });
orderSchema.index({ hasDispute: 1 });
// Generate order number before save
orderSchema.pre('save', async function (next) {
    if (this.isNew) {
        const count = await mongoose_1.default.model('Order').countDocuments();
        this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(6, '0')}`;
        // Add initial status to history
        this.statusHistory.push({
            status: this.status,
            updatedBy: this.customer,
            updatedAt: new Date(),
        });
    }
    next();
});
// Method to check if order can be delivered
orderSchema.methods.canBeDelivered = function () {
    return this.status === OrderStatus.SHIPPED ||
        this.status === OrderStatus.OUT_FOR_DELIVERY;
};
// Method to check if order can be completed
orderSchema.methods.canBeCompleted = function () {
    return this.customerConfirmedDelivery &&
        this.sellerConfirmedDelivery &&
        this.status === OrderStatus.DELIVERED;
};
// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
    return [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
    ].includes(this.status);
};
// Method to check if order can be disputed
orderSchema.methods.canBeDisputed = function () {
    return [
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETED,
    ].includes(this.status) && !this.hasDispute;
};
// Method to add status update
orderSchema.methods.addStatusUpdate = async function (status, userId, note) {
    this.status = status;
    this.statusHistory.push({
        status,
        note,
        updatedBy: mongoose_1.default.Types.ObjectId.createFromHexString(userId),
        updatedAt: new Date(),
    });
    await this.save();
};
// Don't return deleted orders in queries by default
orderSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const Order = mongoose_1.default.model('Order', orderSchema);
exports.default = Order;
//# sourceMappingURL=Order.js.map