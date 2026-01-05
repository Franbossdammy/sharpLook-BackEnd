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
exports.DisputeResolution = exports.DisputeReason = exports.DisputeStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "open";
    DisputeStatus["UNDER_REVIEW"] = "under_review";
    DisputeStatus["AWAITING_RESPONSE"] = "awaiting_response";
    DisputeStatus["RESOLVED"] = "resolved";
    DisputeStatus["CLOSED"] = "closed";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
var DisputeReason;
(function (DisputeReason) {
    DisputeReason["PRODUCT_NOT_RECEIVED"] = "product_not_received";
    DisputeReason["PRODUCT_DAMAGED"] = "product_damaged";
    DisputeReason["WRONG_PRODUCT"] = "wrong_product";
    DisputeReason["PRODUCT_NOT_AS_DESCRIBED"] = "product_not_as_described";
    DisputeReason["QUALITY_ISSUE"] = "quality_issue";
    DisputeReason["DELIVERY_ISSUE"] = "delivery_issue";
    DisputeReason["PAYMENT_ISSUE"] = "payment_issue";
    DisputeReason["OTHER"] = "other";
})(DisputeReason || (exports.DisputeReason = DisputeReason = {}));
var DisputeResolution;
(function (DisputeResolution) {
    DisputeResolution["FULL_REFUND"] = "full_refund";
    DisputeResolution["PARTIAL_REFUND"] = "partial_refund";
    DisputeResolution["REPLACEMENT"] = "replacement";
    DisputeResolution["SELLER_WINS"] = "seller_wins";
    DisputeResolution["CUSTOMER_WINS"] = "customer_wins";
})(DisputeResolution || (exports.DisputeResolution = DisputeResolution = {}));
const disputeSchema = new mongoose_1.Schema({
    disputeNumber: {
        type: String,
        required: false,
        unique: true,
        index: true,
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'Order is required'],
        index: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
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
    reason: {
        type: String,
        enum: Object.values(DisputeReason),
        required: [true, 'Dispute reason is required'],
        index: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [20, 'Description must be at least 20 characters'],
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
        trim: true,
    },
    evidence: [String],
    status: {
        type: String,
        enum: Object.values(DisputeStatus),
        default: DisputeStatus.OPEN,
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        index: true,
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    assignedAt: Date,
    messages: [
        {
            sender: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            senderRole: {
                type: String,
                enum: ['customer', 'seller', 'admin'],
                required: true,
            },
            message: {
                type: String,
                required: [true, 'Message text is required'],
                minlength: [1, 'Message cannot be empty'],
                maxlength: [1000, 'Message cannot exceed 1000 characters'],
                trim: true,
            },
            attachments: [String],
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    lastMessageAt: Date,
    resolution: {
        type: String,
        enum: Object.values(DisputeResolution),
    },
    resolutionNote: {
        type: String,
        maxlength: [1000, 'Resolution note cannot exceed 1000 characters'],
        trim: true,
    },
    refundAmount: {
        type: Number,
        min: [0, 'Refund amount cannot be negative'],
    },
    resolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    resolvedAt: Date,
    closedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    closedAt: Date,
    closureNote: {
        type: String,
        trim: true,
    },
    customerResponded: {
        type: Boolean,
        default: false,
    },
    sellerResponded: {
        type: Boolean,
        default: false,
    },
    lastResponseAt: Date,
    isEscalated: {
        type: Boolean,
        default: false,
        index: true,
    },
    escalatedAt: Date,
    escalatedReason: String,
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
disputeSchema.index({ disputeNumber: 1 }, { unique: true });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ customer: 1, status: 1 });
disputeSchema.index({ seller: 1, status: 1 });
disputeSchema.index({ assignedTo: 1, status: 1 });
disputeSchema.index({ priority: -1, createdAt: 1 });
// ✅ FIXED: Generate dispute number before save
disputeSchema.pre('save', async function (next) {
    if (this.isNew && !this.disputeNumber) {
        try {
            // Use this.constructor to reference the model safely
            const DisputeModel = this.constructor;
            const count = await DisputeModel.countDocuments();
            const timestamp = Date.now();
            const paddedCount = (count + 1).toString().padStart(6, '0');
            this.disputeNumber = `DSP-${timestamp}-${paddedCount}`;
            console.log('✅ Generated dispute number:', this.disputeNumber);
        }
        catch (error) {
            console.error('❌ Error generating dispute number:', error);
            // Fallback: generate without count query
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            this.disputeNumber = `DSP-${timestamp}-${randomSuffix}`;
            console.log('⚠️ Used fallback dispute number:', this.disputeNumber);
        }
    }
    next();
});
// Method to add a message with validation
disputeSchema.methods.addMessage = async function (senderId, senderRole, message, attachments) {
    // Validate message
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
        throw new Error('Message cannot be empty');
    }
    if (trimmedMessage.length > 1000) {
        throw new Error('Message cannot exceed 1000 characters');
    }
    // Validate sender role
    if (!['customer', 'seller', 'admin'].includes(senderRole)) {
        throw new Error('Invalid sender role');
    }
    // Add the message
    this.messages.push({
        sender: mongoose_1.default.Types.ObjectId.createFromHexString(senderId),
        senderRole,
        message: trimmedMessage,
        attachments,
        createdAt: new Date(),
    });
    this.lastMessageAt = new Date();
    this.lastResponseAt = new Date();
    if (senderRole === 'customer') {
        this.customerResponded = true;
    }
    else if (senderRole === 'seller') {
        this.sellerResponded = true;
    }
    await this.save();
};
// Method to check if dispute can be resolved
disputeSchema.methods.canBeResolved = function () {
    return [
        DisputeStatus.OPEN,
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.AWAITING_RESPONSE,
    ].includes(this.status);
};
// Method to check if dispute can be closed
disputeSchema.methods.canBeClosed = function () {
    return this.status === DisputeStatus.RESOLVED;
};
// Don't return deleted disputes in queries by default
disputeSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const Dispute = mongoose_1.default.models.DisputeProduct ||
    mongoose_1.default.model('DisputeProduct', disputeSchema);
exports.default = Dispute;
//# sourceMappingURL=DisputeProduct.js.map