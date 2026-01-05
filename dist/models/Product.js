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
exports.ProductCondition = exports.ProductStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["PENDING"] = "pending";
    ProductStatus["APPROVED"] = "approved";
    ProductStatus["REJECTED"] = "rejected";
    ProductStatus["OUT_OF_STOCK"] = "out_of_stock";
    ProductStatus["DISCONTINUED"] = "discontinued";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
var ProductCondition;
(function (ProductCondition) {
    ProductCondition["NEW"] = "new";
    ProductCondition["REFURBISHED"] = "refurbished";
    ProductCondition["USED"] = "used";
})(ProductCondition || (exports.ProductCondition = ProductCondition = {}));
const productSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters'],
        index: 'text',
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    shortDescription: {
        type: String,
        maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Seller is required'],
        index: true,
    },
    sellerType: {
        type: String,
        enum: ['vendor', 'admin'],
        required: true,
        index: true,
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
    tags: [String],
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
        type: Number,
        min: [0, 'Compare price cannot be negative'],
    },
    costPrice: {
        type: Number,
        min: [0, 'Cost price cannot be negative'],
    },
    discount: {
        type: {
            type: String,
            enum: ['percentage', 'fixed'],
        },
        value: {
            type: Number,
            min: [0, 'Discount value cannot be negative'],
        },
        startDate: Date,
        endDate: Date,
    },
    stock: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0,
    },
    lowStockThreshold: {
        type: Number,
        default: 5,
        min: [0, 'Threshold cannot be negative'],
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
    },
    barcode: String,
    images: {
        type: [String],
        required: [true, 'At least one product image is required'],
        validate: {
            validator: function (v) {
                return v && v.length > 0;
            },
            message: 'At least one image is required',
        },
    },
    condition: {
        type: String,
        enum: Object.values(ProductCondition),
        default: ProductCondition.NEW,
    },
    brand: {
        type: String,
        trim: true,
    },
    weight: {
        type: Number,
        min: [0, 'Weight cannot be negative'],
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
            type: String,
            enum: ['cm', 'inch'],
            default: 'cm',
        },
    },
    variants: [
        {
            name: {
                type: String,
                required: true,
            },
            options: {
                type: [String],
                required: true,
            },
            priceModifier: {
                type: Number,
                default: 0,
            },
        },
    ],
    deliveryOptions: {
        homeDelivery: {
            type: Boolean,
            default: true,
        },
        pickup: {
            type: Boolean,
            default: false,
        },
        freeDelivery: {
            type: Boolean,
            default: false,
        },
        deliveryFee: {
            type: Number,
            min: [0, 'Delivery fee cannot be negative'],
            default: 0,
        },
        estimatedDeliveryDays: {
            type: Number,
            min: [1, 'Delivery days must be at least 1'],
            max: [30, 'Delivery days cannot exceed 30'],
        },
        // ADD THIS SECTION
        deliveryPricing: {
            baseDistanceKm: {
                type: Number,
                default: 5,
            },
            baseFee: {
                type: Number,
                default: 500,
            },
            pricePerKm: {
                type: Number,
                default: 100,
            },
            maxDeliveryDistance: {
                type: Number,
                default: 50,
            },
        },
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
        },
        coordinates: {
            type: [Number],
        },
        address: String,
        city: String,
        state: String,
        country: String,
    },
    status: {
        type: String,
        enum: Object.values(ProductStatus),
        default: ProductStatus.PENDING,
        index: true,
    },
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
    approvedAt: Date,
    rejectionReason: String,
    isFeatured: {
        type: Boolean,
        default: false,
        index: true,
    },
    featuredUntil: Date,
    featuredBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    isSponsored: {
        type: Boolean,
        default: false,
        index: true,
    },
    sponsoredUntil: Date,
    sponsoredBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    sponsorshipAmount: {
        type: Number,
        min: [0, 'Sponsorship amount cannot be negative'],
    },
    views: {
        type: Number,
        default: 0,
        min: [0, 'Views cannot be negative'],
    },
    orders: {
        type: Number,
        default: 0,
        min: [0, 'Orders cannot be negative'],
    },
    revenue: {
        type: Number,
        default: 0,
        min: [0, 'Revenue cannot be negative'],
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
    },
    totalRatings: {
        type: Number,
        default: 0,
        min: [0, 'Total ratings cannot be negative'],
    },
    metaTitle: String,
    metaDescription: String,
    slug: {
        type: String,
        unique: true,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ seller: 1, approvalStatus: 1 });
productSchema.index({ category: 1, approvalStatus: 1 });
productSchema.index({ status: 1, approvalStatus: 1, isActive: 1 });
productSchema.index({ isFeatured: -1, createdAt: -1 });
productSchema.index({ isSponsored: -1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ 'location': '2dsphere' });
// Auto-generate slug from name
productSchema.pre('save', function (next) {
    if (this.isModified('name') || this.isNew) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Date.now();
    }
    next();
});
// Update stock status based on quantity
productSchema.pre('save', function (next) {
    if (this.isModified('stock')) {
        if (this.stock === 0) {
            this.status = ProductStatus.OUT_OF_STOCK;
        }
        else if (this.status === ProductStatus.OUT_OF_STOCK && this.stock > 0) {
            this.status = ProductStatus.APPROVED;
        }
    }
    next();
});
// Method to calculate final price with discount
productSchema.methods.calculateFinalPrice = function () {
    let finalPrice = this.price;
    if (this.discount && this.isDiscountActive()) {
        if (this.discount.type === 'percentage') {
            finalPrice = this.price - (this.price * this.discount.value) / 100;
        }
        else if (this.discount.type === 'fixed') {
            finalPrice = Math.max(0, this.price - this.discount.value);
        }
    }
    return Math.round(finalPrice * 100) / 100;
};
// Method to check if product is in stock
productSchema.methods.isInStock = function () {
    return this.stock > 0 && this.status !== ProductStatus.OUT_OF_STOCK;
};
// Method to check if discount is currently active
productSchema.methods.isDiscountActive = function () {
    if (!this.discount)
        return false;
    const now = new Date();
    const startDateValid = !this.discount.startDate || this.discount.startDate <= now;
    const endDateValid = !this.discount.endDate || this.discount.endDate >= now;
    return startDateValid && endDateValid;
};
// Method to decrement stock
productSchema.methods.decrementStock = async function (quantity) {
    if (this.stock < quantity) {
        throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
    await this.save();
};
// Method to increment stock
productSchema.methods.incrementStock = async function (quantity) {
    this.stock += quantity;
    await this.save();
};
// Virtual for final price
productSchema.virtual('finalPrice').get(function () {
    return this.calculateFinalPrice();
});
// Don't return deleted products in queries by default
productSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const Product = mongoose_1.default.model('Product', productSchema);
exports.default = Product;
//# sourceMappingURL=Product.js.map