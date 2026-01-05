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
const disputeSchema = new mongoose_1.Schema({
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        required: [true, 'Booking is required'],
        index: true,
    },
    raisedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Raised by user is required'],
        index: true,
    },
    against: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Against user is required'],
        index: true,
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true,
        maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
        type: String,
        enum: ['service_quality', 'payment', 'cancellation', 'communication', 'other'],
        required: true,
        index: true,
    },
    evidence: [
        {
            type: {
                type: String,
                enum: ['text', 'image', 'document'],
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
            uploadedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        },
    ],
    status: {
        type: String,
        enum: Object.values(types_1.DisputeStatus),
        default: types_1.DisputeStatus.OPEN,
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true,
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: String,
    resolution: {
        type: String,
        enum: Object.values(types_1.DisputeResolution),
    },
    resolutionDetails: String,
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    refundAmount: Number,
    vendorPaymentAmount: Number,
    messages: [
        {
            sender: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            message: {
                type: String,
                required: true,
                maxlength: [1000, 'Message cannot exceed 1000 characters'],
            },
            attachments: [String],
            sentAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    closedAt: Date,
    closedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
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
disputeSchema.index({ booking: 1 });
disputeSchema.index({ raisedBy: 1, status: 1 });
disputeSchema.index({ against: 1, status: 1 });
disputeSchema.index({ assignedTo: 1, status: 1 });
disputeSchema.index({ status: 1, priority: -1 });
disputeSchema.index({ createdAt: -1 });
disputeSchema.index({ category: 1 });
// Don't return deleted disputes in queries by default
disputeSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const Dispute = mongoose_1.default.model('Dispute', disputeSchema);
exports.default = Dispute;
//# sourceMappingURL=Dispute.js.map