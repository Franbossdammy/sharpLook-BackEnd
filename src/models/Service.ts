import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IService extends Document {
  _id: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: mongoose.Types.ObjectId;
  subCategory?: mongoose.Types.ObjectId;
  basePrice: number;
  priceType: 'fixed' | 'hourly' | 'negotiable';
  duration?: number; // in minutes
  images: string[];
  isActive: boolean;
  tags: string[];
  requirements?: string[];
  whatIsIncluded?: string[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  availability?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  metadata?: {
    views: number;
    bookings: number;
    completedBookings: number;
    averageRating: number;
    totalReviews: number;
  };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  approvalNotes?: string;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    subCategory: {
      type: Schema.Types.ObjectId,
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
        validator: function (v: string[]) {
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
        validator: function (v: string[]) {
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
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    approvalNotes: {
      type: String,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

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
serviceSchema.methods.incrementViews = async function (): Promise<void> {
  this.metadata.views += 1;
  await this.save();
};

const Service: Model<IService> = mongoose.model<IService>('Service', serviceSchema);

export default Service;