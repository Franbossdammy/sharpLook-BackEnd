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
const withdrawalSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: [1000, 'Minimum withdrawal is ₦1,000'],
    },
    bankName: {
        type: String,
        required: true,
    },
    bankCode: {
        type: String,
        required: true
    },
    accountNumber: {
        type: String,
        required: true,
    },
    accountName: {
        type: String,
        required: true,
    },
    reference: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    withdrawalFee: {
        type: Number,
        default: 100,
    },
    netAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'rejected'],
        default: 'pending',
        index: true,
    },
    paystackRecipientCode: String,
    paystackTransferCode: String,
    requestedAt: {
        type: Date,
        default: Date.now,
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    rejectedAt: Date,
    processedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    failureReason: String,
    rejectionReason: String,
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
withdrawalSchema.index({ user: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ reference: 1 });
// Don't return deleted withdrawals
withdrawalSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const Withdrawal = mongoose_1.default.model('Withdrawal', withdrawalSchema);
exports.default = Withdrawal;
//# sourceMappingURL=Withdrawal.js.map