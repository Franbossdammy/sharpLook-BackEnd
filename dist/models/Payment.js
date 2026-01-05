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
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const paymentSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true,
    },
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        index: true,
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        index: true,
    },
    penaltyAmount: {
        type: Number,
        default: 0,
    },
    // ✅ ADD THIS FIELD
    paymentType: {
        type: String,
        enum: ['booking', 'order', 'wallet_funding'],
        required: false,
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative'],
    },
    currency: {
        type: String,
        default: 'NGN',
        enum: ['NGN', 'USD'],
    },
    status: {
        type: String,
        enum: Object.values(types_1.PaymentStatus),
        default: types_1.PaymentStatus.PENDING,
        index: true,
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank_transfer', 'wallet', 'ussd'],
        default: 'card',
    },
    reference: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    paystackReference: {
        type: String,
        index: true,
    },
    authorizationCode: String,
    initiatedAt: {
        type: Date,
        default: Date.now,
    },
    paidAt: Date,
    escrowedAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    escrowStatus: {
        type: String,
        enum: ['pending', 'held', 'released', 'refunded'],
        default: 'pending',
        index: true,
    },
    releaseDate: Date,
    vendorAmount: Number,
    platformFee: Number,
    commissionRate: {
        type: Number,
        default: 10, // 10% commission
    },
    vendorPaidAt: Date,
    refundAmount: Number,
    refundReason: String,
    refundedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    ipAddress: String,
    userAgent: String,
    metadata: mongoose_1.Schema.Types.Mixed,
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
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ reference: 1 }, { unique: true });
paymentSchema.index({ paystackReference: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ escrowStatus: 1 });
paymentSchema.index({ paymentType: 1 }); // ✅ ADD THIS INDEX
// Don't return deleted payments in queries by default
paymentSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
// ✅ UPDATED: Validation - Allow wallet funding without booking/order
paymentSchema.pre('save', function (next) {
    // Skip validation for wallet funding
    if (this.paymentType === 'wallet_funding') {
        return next();
    }
    // For other payment types, require booking or order
    if (!this.booking && !this.order) {
        return next(new Error('Payment must be associated with either a booking or an order'));
    }
    if (this.booking && this.order) {
        return next(new Error('Payment cannot be associated with both a booking and an order'));
    }
    next();
});
// ✅ UPDATED: Calculate vendor amount - Skip for wallet funding
paymentSchema.pre('save', function (next) {
    // Skip fee calculation for wallet funding
    if (this.paymentType === 'wallet_funding') {
        this.platformFee = 0;
        this.vendorAmount = 0;
        return next();
    }
    // Calculate fees for booking/order payments
    if (this.isModified('amount') || this.isNew) {
        const commissionRate = this.commissionRate || 10;
        this.platformFee = Math.round((this.amount * commissionRate) / 100);
        this.vendorAmount = this.amount - this.platformFee;
    }
    next();
});
const Payment = mongoose_1.default.model('Payment', paymentSchema);
exports.default = Payment;
//# sourceMappingURL=Payment.js.map