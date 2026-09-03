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
const couponSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        required: [true, 'Discount type is required'],
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative'],
    },
    minOrderAmount: {
        type: Number,
        default: 0,
        min: [0, 'Minimum order amount cannot be negative'],
    },
    maxDiscountAmount: {
        type: Number,
        min: [0, 'Max discount amount cannot be negative'],
    },
    maxUses: {
        type: Number,
        default: null,
        min: [1, 'Max uses must be at least 1'],
    },
    usedCount: {
        type: Number,
        default: 0,
        min: [0, 'Used count cannot be negative'],
    },
    usedBy: [
        {
            user: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            usedAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    maxUsesPerUser: {
        type: Number,
        default: 1,
        min: [1, 'Max uses per user must be at least 1'],
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiry date is required'],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });
const Coupon = mongoose_1.default.model('Coupon', couponSchema);
exports.default = Coupon;
//# sourceMappingURL=Coupon.js.map