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
const serviceSchema = new mongoose_1.Schema({
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vendor is required'],
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true,
        maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Service description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
        index: true,
    },
    subCategory: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
    },
    basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Price cannot be negative'],
    },
    priceType: {
        type: String,
        enum: ['fixed', 'hourly', 'negotiable'],
        default: 'fixed',
    },
    duration: {
        type: Number,
        min: [0, 'Duration cannot be negative'],
    },
    images: {
        type: [String],
        validate: {
            validator: function (v) {
                return v.length <= 10;
            },
            message: 'Cannot upload more than 10 images',
        },
    },
    isActive: {
        type: Boolean,
        default: false, // Changed: starts as inactive until approved
        index: true,
    },
    tags: {
        type: [String],
        validate: {
            validator: function (v) {
                return v.length <= 20;
            },
            message: 'Cannot have more than 20 tags',
        },
    },
    requirements: [String],
    whatIsIncluded: [String],
    faqs: [
        {
            question: {
                type: String,
                required: true,
            },
            answer: {
                type: String,
                required: true,
            },
        },
    ],
    availability: {
        monday: { type: Boolean, default: true },
        tuesday: { type: Boolean, default: true },
        wednesday: { type: Boolean, default: true },
        thursday: { type: Boolean, default: true },
        friday: { type: Boolean, default: true },
        saturday: { type: Boolean, default: true },
        sunday: { type: Boolean, default: false },
    },
    metadata: {
        views: { type: Number, default: 0 },
        bookings: { type: Number, default: 0 },
        completedBookings: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0 },
    },
    // Approval fields
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: {
        type: Date,
    },
    approvalNotes: {
        type: String,
    },
    rejectedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    rejectedAt: {
        type: Date,
    },
    rejectionReason: {
        type: String,
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
serviceSchema.index({ vendor: 1, isActive: 1 });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ slug: 1 });
serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });
serviceSchema.index({ basePrice: 1 });
serviceSchema.index({ 'metadata.averageRating': -1 });
serviceSchema.index({ 'metadata.bookings': -1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ approvalStatus: 1, createdAt: 1 }); // For admin queries
// Virtual for reviews
serviceSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'service',
});
// Don't return deleted services in queries by default
serviceSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
// Increment view count
serviceSchema.methods.incrementViews = async function () {
    this.metadata.views += 1;
    await this.save();
};
const Service = mongoose_1.default.model('Service', serviceSchema);
exports.default = Service;
//# sourceMappingURL=Service.js.map