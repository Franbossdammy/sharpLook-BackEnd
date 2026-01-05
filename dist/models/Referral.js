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
const referralSchema = new mongoose_1.Schema({
    referrer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Referrer is required'],
        index: true,
    },
    referee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Referee is required'],
        index: true,
    },
    referralCode: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'expired', 'cancelled'],
        default: 'pending',
        index: true,
    },
    referrerReward: {
        type: Number,
        default: 1000, // ₦1,000 for referrer
    },
    refereeReward: {
        type: Number,
        default: 500, // ₦500 for referee
    },
    requiresFirstBooking: {
        type: Boolean,
        default: true,
    },
    firstBookingCompleted: {
        type: Boolean,
        default: false,
    },
    firstBookingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
    },
    referrerPaid: {
        type: Boolean,
        default: false,
    },
    referrerPaidAt: Date,
    referrerPaymentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Transaction',
    },
    refereePaid: {
        type: Boolean,
        default: false,
    },
    refereePaidAt: Date,
    refereePaymentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Transaction',
    },
    completedAt: Date,
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        index: true,
    },
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
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referee: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1, expiresAt: 1 });
referralSchema.index({ createdAt: -1 });
// Don't return deleted referrals in queries by default
referralSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const Referral = mongoose_1.default.model('Referral', referralSchema);
exports.default = Referral;
//# sourceMappingURL=Referral.js.map