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
const bookingSchema = new mongoose_1.Schema({
    bookingType: {
        type: String,
        enum: Object.values(types_1.BookingType),
        default: types_1.BookingType.STANDARD,
        required: true,
    },
    client: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Client is required'],
        index: true,
    },
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vendor is required'],
        index: true,
    },
    service: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Service',
        required: function () {
            // Service is only required for direct bookings, not offer-based bookings
            return this.bookingType !== types_1.BookingType.OFFER_BASED;
        },
        index: true,
    },
    offer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Offer',
    },
    scheduledDate: {
        type: Date,
        required: [true, 'Scheduled date is required'],
        index: true,
    },
    scheduledTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    duration: {
        type: Number,
        min: [0, 'Duration cannot be negative'],
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            index: '2dsphere',
        },
        address: String,
        city: String,
        state: String,
    },
    servicePrice: {
        type: Number,
        required: true,
        min: [0, 'Service price cannot be negative'],
    },
    distanceCharge: {
        type: Number,
        default: 0,
        min: [0, 'Distance charge cannot be negative'],
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative'],
    },
    status: {
        type: String,
        enum: Object.values(types_1.BookingStatus),
        default: types_1.BookingStatus.PENDING,
        index: true,
    },
    statusHistory: [
        {
            status: {
                type: String,
                enum: Object.values(types_1.BookingStatus),
                required: true,
            },
            changedAt: {
                type: Date,
                default: Date.now,
            },
            changedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            reason: String,
        },
    ],
    clientNotes: {
        type: String,
        maxlength: [1000, 'Client notes cannot exceed 1000 characters'],
    },
    vendorNotes: {
        type: String,
        maxlength: [1000, 'Vendor notes cannot exceed 1000 characters'],
    },
    completedAt: Date,
    completedBy: {
        type: String,
        enum: ['client', 'vendor', 'both'],
    },
    clientMarkedComplete: {
        type: Boolean,
        default: false,
    },
    vendorMarkedComplete: {
        type: Boolean,
        default: false,
    },
    paymentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Payment',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'escrowed', 'released', 'refunded', 'partially_refunded'],
        default: 'pending',
    },
    paymentReference: String,
    cancelledAt: Date,
    cancelledBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    cancellationReason: String,
    hasDispute: {
        type: Boolean,
        default: false,
    },
    disputeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Dispute',
    },
    hasReview: {
        type: Boolean,
        default: false,
    },
    reviewId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Review',
    },
    acceptedAt: Date,
    rejectedAt: Date,
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
bookingSchema.index({ client: 1, status: 1 });
bookingSchema.index({ vendor: 1, status: 1 });
bookingSchema.index({ service: 1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ paymentStatus: 1 });
// Don't return deleted bookings in queries by default
bookingSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
// Add status to history when status changes
bookingSchema.pre('save', function (next) {
    if (this.isModified('status') && !this.isNew) {
        this.statusHistory.push({
            status: this.status,
            changedAt: new Date(),
            changedBy: this.client, // Will be overridden with actual user
            reason: undefined,
        });
    }
    next();
});
// Check if both parties marked complete
bookingSchema.methods.checkCompletion = function () {
    if (this.clientMarkedComplete && this.vendorMarkedComplete) {
        this.status = types_1.BookingStatus.COMPLETED;
        this.completedAt = new Date();
        this.completedBy = 'both';
    }
};
const Booking = mongoose_1.default.model('Booking', bookingSchema);
exports.default = Booking;
//# sourceMappingURL=Booking.js.map