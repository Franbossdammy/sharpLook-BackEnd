import mongoose, { Document, Schema, Model } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum DeliveryType {
  HOME_DELIVERY = 'home_delivery',
  PICKUP = 'pickup',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  USSD = 'ussd',
}

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  selectedVariant?: {
    name: string;
    option: string;
  };
  subtotal: number;
}

export interface IDeliveryAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
  additionalInfo?: string;
  coordinates?: [number, number]; 

}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  
  // Customer and seller
  customer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  sellerType: 'vendor' | 'admin';
  
  // Order items
  items: IOrderItem[];
  
  // Pricing
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  totalAmount: number;
  
  // Delivery
  deliveryType: DeliveryType;
  deliveryAddress?: IDeliveryAddress;
  pickupLocation?: {
    address: string;
    city: string;
    state: string;
    phone: string;
  };
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentReference: string;
  payment: mongoose.Types.ObjectId;
  isPaid: boolean;
  paidAt?: Date;
  
  // Escrow
  escrowStatus: 'pending' | 'locked' | 'released' | 'refunded';
  escrowedAmount: number;
  escrowedAt?: Date;
  escrowReleaseDate?: Date;
  
  // Order status
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    note?: string;
    updatedBy: mongoose.Types.ObjectId;
    updatedAt: Date;
  }[];
  
  // Delivery confirmation
  customerConfirmedDelivery: boolean;
  customerConfirmedAt?: Date;
  sellerConfirmedDelivery: boolean;
  sellerConfirmedAt?: Date;
  
  // Ratings and reviews
  isRated: boolean;
  rating?: number;
  review?: mongoose.Types.ObjectId;
  
  // Dispute
  hasDispute: boolean;
  dispute?: mongoose.Types.ObjectId;
  disputeReason?: string;
  disputeOpenedAt?: Date;
  
  // Cancellation
  cancellationReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  
  // Notes
  customerNotes?: string;
  sellerNotes?: string;
  adminNotes?: string;
  
  // Tracking
  trackingNumber?: string;
  courierService?: string;
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  canBeDelivered(): boolean;
  canBeCompleted(): boolean;
  canBeCancelled(): boolean;
  canBeDisputed(): boolean;
  addStatusUpdate(status: OrderStatus, userId: string, note?: string): Promise<void>;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      index: true,
    },
    sellerType: {
      type: String,
      enum: ['vendor', 'admin'],
      required: true,
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative'],
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        selectedVariant: {
          name: String,
          option: String,
        },
        subtotal: {
          type: Number,
          required: true,
          min: [0, 'Subtotal cannot be negative'],
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    deliveryType: {
      type: String,
      enum: Object.values(DeliveryType),
      required: [true, 'Delivery type is required'],
    },
    deliveryAddress: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      additionalInfo: String,
       coordinates: {          
    type: [Number],
    required: false,
  }
    },
    pickupLocation: {
      address: String,
      city: String,
      state: String,
      phone: String,
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, 'Payment method is required'],
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    paidAt: Date,
    escrowStatus: {
      type: String,
      enum: ['pending', 'locked', 'released', 'refunded'],
      default: 'pending',
      index: true,
    },
    escrowedAmount: {
      type: Number,
      required: true,
      min: [0, 'Escrowed amount cannot be negative'],
    },
    escrowedAt: Date,
    escrowReleaseDate: Date,
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(OrderStatus),
          required: true,
        },
        note: String,
        updatedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    customerConfirmedDelivery: {
      type: Boolean,
      default: false,
    },
    customerConfirmedAt: Date,
    sellerConfirmedDelivery: {
      type: Boolean,
      default: false,
    },
    sellerConfirmedAt: Date,
    isRated: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
    },
    hasDispute: {
      type: Boolean,
      default: false,
      index: true,
    },
    dispute: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
    },
    disputeReason: String,
    disputeOpenedAt: Date,
    cancellationReason: String,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: Date,
    customerNotes: String,
    sellerNotes: String,
    adminNotes: String,
    trackingNumber: String,
    courierService: String,
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
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ paymentReference: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ escrowStatus: 1 });
orderSchema.index({ hasDispute: 1 });

// Generate order number before save
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(6, '0')}`;
    
    // Add initial status to history
    this.statusHistory.push({
      status: this.status,
      updatedBy: this.customer,
      updatedAt: new Date(),
    });
  }
  next();
});

// Method to check if order can be delivered
orderSchema.methods.canBeDelivered = function(): boolean {
  return this.status === OrderStatus.SHIPPED || 
         this.status === OrderStatus.OUT_FOR_DELIVERY;
};

// Method to check if order can be completed
orderSchema.methods.canBeCompleted = function(): boolean {
  return this.customerConfirmedDelivery && 
         this.sellerConfirmedDelivery && 
         this.status === OrderStatus.DELIVERED;
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function(): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
  ].includes(this.status);
};

// Method to check if order can be disputed
orderSchema.methods.canBeDisputed = function(): boolean {
  return [
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
  ].includes(this.status) && !this.hasDispute;
};

// Method to add status update
orderSchema.methods.addStatusUpdate = async function(
  status: OrderStatus,
  userId: string,
  note?: string
): Promise<void> {
  this.status = status;
  this.statusHistory.push({
    status,
    note,
    updatedBy: mongoose.Types.ObjectId.createFromHexString(userId),
    updatedAt: new Date(),
  });
  await this.save();
};

// Don't return deleted orders in queries by default
orderSchema.pre(/^find/, function(next) {
  // @ts-ignore
  this.find({ isDeleted: { $ne: true } });
  next();
});

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);

export default Order;