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
const offerSchema = new mongoose_1.Schema({
    client: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Client is required'],
        index: true,
    },
    service: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Service',
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    proposedPrice: {
        type: Number,
        required: [true, 'Proposed price is required'],
        min: [0, 'Price cannot be negative'],
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            required: true,
            index: '2dsphere',
        },
        address: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
    },
    preferredDate: Date,
    preferredTime: String,
    flexibility: {
        type: String,
        enum: ['flexible', 'specific', 'urgent'],
        default: 'flexible',
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'accepted', 'expired'],
        default: 'open',
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    responses: [
        {
            vendor: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            proposedPrice: {
                type: Number,
                required: true,
                min: [0, 'Price cannot be negative'],
            },
            counterOffer: {
                type: Number,
                min: [0, 'Counter offer cannot be negative'],
            },
            message: {
                type: String,
                maxlength: [500, 'Message cannot exceed 500 characters'],
            },
            estimatedDuration: Number,
            respondedAt: {
                type: Date,
                default: Date.now,
            },
            isAccepted: {
                type: Boolean,
                default: false,
            },
            acceptedAt: {
                type: Date,
            },
        },
    ],
    selectedVendor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    selectedResponse: mongoose_1.Schema.Types.ObjectId,
    acceptedAt: Date,
    bookingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
    },
    images: [String],
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
offerSchema.index({ client: 1, status: 1 });
offerSchema.index({ category: 1, status: 1 });
offerSchema.index({ expiresAt: 1, status: 1 });
offerSchema.index({ 'location.coordinates': '2dsphere' });
offerSchema.index({ createdAt: -1 });
// Don't return deleted offers in queries by default
offerSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
// Auto-expire offers
offerSchema.methods.checkExpiration = function () {
    if (this.status === 'open' && new Date() > this.expiresAt) {
        this.status = 'expired';
        return true;
    }
    return false;
};
const Offer = mongoose_1.default.model('Offer', offerSchema);
exports.default = Offer;
//# sourceMappingURL=Offer.js.map