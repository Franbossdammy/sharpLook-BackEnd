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
const reviewSchema = new mongoose_1.Schema({
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        required: [true, 'Booking is required'],
        index: true,
    },
    reviewer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reviewer is required'],
        index: true,
    },
    reviewee: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reviewee is required'],
        index: true,
    },
    reviewerType: {
        type: String,
        enum: ['client', 'vendor'],
        required: true,
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        index: true,
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    comment: {
        type: String,
        required: [true, 'Comment is required'],
        trim: true,
        minlength: [10, 'Comment must be at least 10 characters'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    detailedRatings: {
        serviceQuality: {
            type: Number,
            min: 1,
            max: 5,
        },
        communication: {
            type: Number,
            min: 1,
            max: 5,
        },
        punctuality: {
            type: Number,
            min: 1,
            max: 5,
        },
        professionalism: {
            type: Number,
            min: 1,
            max: 5,
        },
        valueForMoney: {
            type: Number,
            min: 1,
            max: 5,
        },
    },
    images: [String],
    response: {
        comment: {
            type: String,
            trim: true,
            maxlength: [500, 'Response cannot exceed 500 characters'],
        },
        respondedAt: Date,
    },
    helpfulCount: {
        type: Number,
        default: 0,
    },
    notHelpfulCount: {
        type: Number,
        default: 0,
    },
    helpfulVotes: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    isApproved: {
        type: Boolean,
        default: true,
    },
    isFlagged: {
        type: Boolean,
        default: false,
        index: true,
    },
    flagReason: String,
    flaggedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    flaggedAt: Date,
    moderatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    moderatedAt: Date,
    moderationNotes: String,
    isHidden: {
        type: Boolean,
        default: false,
    },
    hiddenReason: String,
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
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ reviewee: 1, isApproved: 1, isHidden: 1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ isFlagged: 1, isApproved: 1 });
// Virtual for net helpful votes
reviewSchema.virtual('netHelpfulVotes').get(function () {
    return this.helpfulCount - this.notHelpfulCount;
});
// Don't return deleted reviews in queries by default
reviewSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const Review = mongoose_1.default.model('Review', reviewSchema);
exports.default = Review;
//# sourceMappingURL=Review.js.map