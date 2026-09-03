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
const promoRedemptionSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    redeemedAt: {
        type: Date,
        default: Date.now,
    },
    refundedAt: {
        type: Date,
    },
}, { _id: true });
const promoCampaignSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Campaign name is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    discountAmount: {
        type: Number,
        required: [true, 'Discount amount is required'],
        min: [0, 'Discount amount cannot be negative'],
    },
    vendorBonusAmount: {
        type: Number,
        required: [true, 'Vendor bonus amount is required'],
        min: [0, 'Vendor bonus amount cannot be negative'],
    },
    minServicePrice: {
        type: Number,
        required: [true, 'Minimum service price is required'],
        min: [0, 'Minimum service price cannot be negative'],
    },
    maxSlots: {
        type: Number,
        required: [true, 'Max slots is required'],
        min: [1, 'Max slots must be at least 1'],
    },
    slotsRemaining: {
        type: Number,
        required: true,
        min: [0, 'Slots remaining cannot be negative'],
    },
    maxUsesPerUser: {
        type: Number,
        default: 1,
        min: [1, 'Max uses per user must be at least 1'],
    },
    appliesTo: {
        type: String,
        enum: ['ALL', 'HOME_SERVICE', 'IN_SHOP'],
        default: 'ALL',
    },
    redemptions: [promoRedemptionSchema],
    startsAt: {
        type: Date,
    },
    endsAt: {
        type: Date,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
promoCampaignSchema.index({ isActive: 1, slotsRemaining: 1 });
promoCampaignSchema.index({ 'redemptions.user': 1 });
const PromoCampaign = mongoose_1.default.model('PromoCampaign', promoCampaignSchema);
exports.default = PromoCampaign;
//# sourceMappingURL=PromoCampaign.js.map