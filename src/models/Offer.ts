import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IOffer extends Document {
  _id: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  service?: mongoose.Types.ObjectId; // Optional - can be general request
  category: mongoose.Types.ObjectId;
  
  // Offer details
  title: string;
  description: string;
  serviceType: 'home' | 'shop' | 'both'; // ✅ NEW FIELD
  proposedPrice: number;
  location?: { // ✅ UPDATED: Made optional (required only for home service)
    type: string;
    coordinates: [number, number];
    address: string;
    city: string;
    state: string;
  };
  
  // Scheduling
  preferredDate?: Date;
  preferredTime?: string;
  flexibility: 'flexible' | 'specific' | 'urgent';
  
  // Status
  status: 'open' | 'closed' | 'accepted' | 'expired';
  expiresAt: Date;
  
  // Responses
  responses: {
    vendor: mongoose.Types.ObjectId;
    proposedPrice: number;
    counterOffer?: number;
    message?: string;
    estimatedDuration?: number;
    respondedAt: Date;
    isAccepted: boolean;
    acceptedAt?: Date;
  }[];
  
  // Selected vendor
  selectedVendor?: mongoose.Types.ObjectId;
  selectedResponse?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  
  // Booking
  bookingId?: mongoose.Types.ObjectId;
  
  // Images/attachments
  images?: string[];
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client is required'],
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
    },
    category: {
      type: Schema.Types.ObjectId,
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
    // ✅ NEW FIELD
    serviceType: {
      type: String,
      enum: {
        values: ['home', 'shop', 'both'],
        message: 'Service type must be: home, shop, or both'
      },
      required: [true, 'Service type is required'],
      default: 'both',
      index: true,
    },
    proposedPrice: {
      type: Number,
      required: [true, 'Proposed price is required'],
      min: [0, 'Price cannot be negative'],
    },
    // ✅ UPDATED: Made optional (validation in pre-save hook)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      address: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
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
          type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    selectedResponse: Schema.Types.ObjectId,
    acceptedAt: Date,
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    images: [String],
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
offerSchema.index({ client: 1, status: 1 });
offerSchema.index({ category: 1, status: 1 });
offerSchema.index({ expiresAt: 1, status: 1 });
offerSchema.index({ 'location.coordinates': '2dsphere' });
offerSchema.index({ createdAt: -1 });

// ✅ NEW: Compound index for efficient vendor filtering by service type
offerSchema.index({ status: 1, serviceType: 1, expiresAt: 1 });
offerSchema.index({ serviceType: 1, category: 1, status: 1 });

// ✅ NEW: Pre-save validation for location based on serviceType
offerSchema.pre('save', function (next) {
  // Validate location is provided for home service
  if ((this.serviceType === 'home' || this.serviceType === 'both')) {
    if (!this.location || !this.location.coordinates || this.location.coordinates.length !== 2) {
      return next(new Error('Location with valid coordinates is required for home service offers'));
    }
    if (!this.location.address || !this.location.city || !this.location.state) {
      return next(new Error('Complete location address (address, city, state) is required for home service offers'));
    }
  }
  next();
});

// Don't return deleted offers in queries by default
offerSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Auto-expire offers
offerSchema.methods.checkExpiration = function (): boolean {
  if (this.status === 'open' && new Date() > this.expiresAt) {
    this.status = 'expired';
    return true;
  }
  return false;
};

const Offer: Model<IOffer> = mongoose.model<IOffer>('Offer', offerSchema);

export default Offer;