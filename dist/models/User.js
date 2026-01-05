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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const types_1 = require("../types");
const userSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false,
    },
    role: {
        type: String,
        enum: Object.values(types_1.UserRole),
        default: types_1.UserRole.CLIENT,
    },
    status: {
        type: String,
        enum: Object.values(types_1.UserStatus),
        default: types_1.UserStatus.PENDING_VERIFICATION,
    },
    avatar: {
        type: String,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    isPhoneVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshToken: String,
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: Date,
    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeen: Date,
    // FIXED: Proper Mongoose schema syntax for nested objects
    preferences: {
        darkMode: {
            type: Boolean,
            default: false,
        },
        fingerprintEnabled: {
            type: Boolean,
            default: false,
        },
        // General notifications
        notificationsEnabled: {
            type: Boolean,
            default: true,
        },
        emailNotifications: {
            type: Boolean,
            default: true,
        },
        pushNotifications: {
            type: Boolean,
            default: true,
        },
        // Activity notifications
        bookingUpdates: {
            type: Boolean,
            default: true,
        },
        newMessages: {
            type: Boolean,
            default: true,
        },
        paymentAlerts: {
            type: Boolean,
            default: true,
        },
        reminderNotifications: {
            type: Boolean,
            default: true,
        },
        // Marketing
        promotions: {
            type: Boolean,
            default: false,
        },
    },
    withdrawalPin: {
        type: String,
        select: false,
    },
    referralCode: {
        type: String,
        unique: true,
        required: true,
    },
    referredBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    walletBalance: {
        type: Number,
        default: 0,
        min: [0, 'Wallet balance cannot be negative'],
    },
    // User location (for all users)
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
    isVendor: {
        type: Boolean,
        default: false,
    },
    vendorProfile: {
        businessName: String,
        businessDescription: String,
        vendorType: {
            type: String,
            enum: Object.values(types_1.VendorType),
        },
        categories: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Category',
            }],
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
        serviceRadius: {
            type: Number,
            default: 10,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalRatings: {
            type: Number,
            default: 0,
        },
        completedBookings: {
            type: Number,
            default: 0,
        },
        availabilitySchedule: {
            monday: {
                isAvailable: { type: Boolean, default: true },
                from: String,
                to: String,
            },
            tuesday: {
                isAvailable: { type: Boolean, default: true },
                from: String,
                to: String,
            },
            wednesday: {
                isAvailable: { type: Boolean, default: true },
                from: String,
                to: String,
            },
            thursday: {
                isAvailable: { type: Boolean, default: true },
                from: String,
                to: String,
            },
            friday: {
                isAvailable: { type: Boolean, default: true },
                from: String,
                to: String,
            },
            saturday: {
                isAvailable: { type: Boolean, default: true },
                from: String,
                to: String,
            },
            sunday: {
                isAvailable: { type: Boolean, default: false },
                from: String,
                to: String,
            },
        },
        documents: {
            idCard: String,
            businessLicense: String,
            certification: [String],
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationDate: Date,
        // ✅ ADD THESE NEW FIELDS:
        redFlagCount: {
            type: Number,
            default: 0,
        },
        lastRedFlagAt: {
            type: Date,
        },
        isSuspended: {
            type: Boolean,
            default: false,
        },
        suspendedAt: {
            type: Date,
        },
        suspensionReason: {
            type: String,
        },
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
userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ phone: 1, isDeleted: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'location': '2dsphere' }); // Index for user location
userSchema.index({ 'vendorProfile.location': '2dsphere' }); // Index for vendor location
userSchema.virtual('hasWithdrawalPin').get(function () {
    return !!this.withdrawalPin;
});
// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    const salt = await bcryptjs_1.default.genSalt(12);
    this.password = await bcryptjs_1.default.hash(this.password, salt);
    next();
});
// Hash withdrawal PIN before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('withdrawalPin') || !this.withdrawalPin)
        return next();
    const salt = await bcryptjs_1.default.genSalt(12);
    this.withdrawalPin = await bcryptjs_1.default.hash(this.withdrawalPin, salt);
    next();
});
// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Method to check if account is locked
userSchema.methods.isAccountLocked = function () {
    return !!(this.lockUntil && this.lockUntil > new Date());
};
// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
    // Reset attempts if lock has expired
    if (this.lockUntil && this.lockUntil < new Date()) {
        return await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 },
        });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    // Lock account after 5 failed attempts for 2 hours
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 hours
    if (this.loginAttempts + 1 >= maxAttempts && !this.lockUntil) {
        updates.$set = { lockUntil: new Date(Date.now() + lockTime) };
    }
    await this.updateOne(updates);
};
// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
    await this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 },
    });
};
// Method to check if profile is complete
userSchema.methods.isProfileComplete = function () {
    const basicFieldsComplete = !!(this.firstName &&
        this.lastName &&
        this.email &&
        this.phone &&
        this.isEmailVerified &&
        this.isPhoneVerified);
    // If user is a vendor, check vendor profile completion
    if (this.isVendor) {
        const vendorFieldsComplete = !!(this.vendorProfile?.businessName &&
            this.vendorProfile?.vendorType &&
            this.vendorProfile?.location?.address &&
            this.vendorProfile?.location?.city &&
            this.vendorProfile?.location?.state &&
            this.vendorProfile?.categories?.length);
        return basicFieldsComplete && vendorFieldsComplete;
    }
    return basicFieldsComplete;
};
// Method to get profile completion percentage
userSchema.methods.getProfileCompletionPercentage = function () {
    let totalFields = 0;
    let completedFields = 0;
    // Basic fields (weighted)
    const basicFields = [
        { field: this.firstName, weight: 1 },
        { field: this.lastName, weight: 1 },
        { field: this.email, weight: 1 },
        { field: this.phone, weight: 1 },
        { field: this.isEmailVerified, weight: 2 },
        { field: this.isPhoneVerified, weight: 2 },
        { field: this.avatar, weight: 1 },
    ];
    basicFields.forEach(({ field, weight }) => {
        totalFields += weight;
        if (field)
            completedFields += weight;
    });
    // If vendor, add vendor-specific fields
    if (this.isVendor) {
        const vendorFields = [
            { field: this.vendorProfile?.businessName, weight: 2 },
            { field: this.vendorProfile?.businessDescription, weight: 1 },
            { field: this.vendorProfile?.vendorType, weight: 2 },
            { field: this.vendorProfile?.categories?.length, weight: 2 },
            { field: this.vendorProfile?.location?.address, weight: 1 },
            { field: this.vendorProfile?.location?.city, weight: 1 },
            { field: this.vendorProfile?.location?.state, weight: 1 },
            { field: this.vendorProfile?.documents?.idCard, weight: 2 },
            { field: this.vendorProfile?.isVerified, weight: 2 },
        ];
        vendorFields.forEach(({ field, weight }) => {
            totalFields += weight;
            if (field)
                completedFields += weight;
        });
    }
    return Math.round((completedFields / totalFields) * 100);
};
// Method to get missing fields
userSchema.methods.getMissingFields = function () {
    const missing = [];
    if (!this.firstName)
        missing.push('firstName');
    if (!this.lastName)
        missing.push('lastName');
    if (!this.email)
        missing.push('email');
    if (!this.phone)
        missing.push('phone');
    if (!this.isEmailVerified)
        missing.push('emailVerification');
    if (!this.isPhoneVerified)
        missing.push('phoneVerification');
    if (!this.avatar)
        missing.push('avatar');
    if (this.isVendor) {
        if (!this.vendorProfile?.businessName)
            missing.push('businessName');
        if (!this.vendorProfile?.businessDescription)
            missing.push('businessDescription');
        if (!this.vendorProfile?.vendorType)
            missing.push('vendorType');
        if (!this.vendorProfile?.categories?.length)
            missing.push('categories');
        if (!this.vendorProfile?.location?.address)
            missing.push('address');
        if (!this.vendorProfile?.location?.city)
            missing.push('city');
        if (!this.vendorProfile?.location?.state)
            missing.push('state');
        if (!this.vendorProfile?.documents?.idCard)
            missing.push('idCard');
        if (!this.vendorProfile?.isVerified)
            missing.push('verification');
    }
    return missing;
};
// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
// Don't return deleted users in queries by default
userSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.find({ isDeleted: { $ne: true } });
    next();
});
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
//# sourceMappingURL=User.js.map