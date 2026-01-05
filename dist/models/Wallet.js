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
exports.PaymentStatus = exports.TransactionType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "deposit";
    TransactionType["WITHDRAWAL"] = "withdrawal";
    TransactionType["BOOKING_PAYMENT"] = "booking_payment";
    TransactionType["REFUND"] = "refund";
    TransactionType["COMMISSION"] = "commission";
    TransactionType["REFERRAL_BONUS"] = "referral_bonus";
    TransactionType["SUBSCRIPTION_PAYMENT"] = "subscription_payment";
    TransactionType["ADMIN_CREDIT"] = "admin_credit";
    TransactionType["ADMIN_DEBIT"] = "admin_debit";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["ESCROWED"] = "escrowed";
    PaymentStatus["RELEASED"] = "released";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
const transactionSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: Object.values(TransactionType),
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.COMPLETED,
    },
    reference: String,
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
    },
    description: String,
    metadata: mongoose_1.Schema.Types.Mixed,
}, {
    timestamps: true,
});
const walletSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    availableBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    pendingBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalEarned: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalWithdrawn: {
        type: Number,
        default: 0,
        min: 0,
    },
    transactions: [transactionSchema],
    lastTransactionAt: Date,
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
walletSchema.index({ user: 1, isActive: 1 });
walletSchema.index({ 'transactions.booking': 1 });
walletSchema.index({ 'transactions.createdAt': -1 });
// Virtual for total balance
walletSchema.virtual('totalBalance').get(function () {
    return this.availableBalance + this.pendingBalance;
});
// Method to add transaction
walletSchema.methods.addTransaction = async function (transaction) {
    this.transactions.push({
        ...transaction,
        createdAt: new Date(),
    });
    this.lastTransactionAt = new Date();
    await this.save();
    return this;
};
// Method to credit available balance
walletSchema.methods.creditAvailable = async function (amount, type, reference, booking, description) {
    if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    this.availableBalance += amount;
    await this.addTransaction({
        type,
        amount,
        status: PaymentStatus.COMPLETED,
        reference,
        booking: booking,
        description: description || `Credit: ${type}`,
    });
    return this;
};
// Method to debit available balance
walletSchema.methods.debitAvailable = async function (amount, type, reference, booking, description) {
    if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    if (this.availableBalance < amount) {
        throw new Error('Insufficient balance');
    }
    this.availableBalance -= amount;
    if (type === TransactionType.WITHDRAWAL) {
        this.totalWithdrawn += amount;
    }
    await this.addTransaction({
        type,
        amount,
        status: PaymentStatus.COMPLETED,
        reference,
        booking: booking,
        description: description || `Debit: ${type}`,
    });
    return this;
};
// Method to move money to escrow (when booking is paid)
walletSchema.methods.moveToEscrow = async function (amount, bookingId) {
    if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    this.pendingBalance += amount;
    await this.addTransaction({
        type: TransactionType.BOOKING_PAYMENT,
        amount,
        status: PaymentStatus.ESCROWED,
        booking: bookingId,
        description: 'Payment held in escrow',
    });
    return this;
};
// Method to release from escrow to available (when booking is completed)
walletSchema.methods.releaseFromEscrow = async function (amount, bookingId) {
    if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    if (this.pendingBalance < amount) {
        throw new Error('Insufficient pending balance');
    }
    this.pendingBalance -= amount;
    this.availableBalance += amount;
    this.totalEarned += amount;
    await this.addTransaction({
        type: TransactionType.BOOKING_PAYMENT,
        amount,
        status: PaymentStatus.RELEASED,
        booking: bookingId,
        description: 'Payment released from escrow',
    });
    return this;
};
// Method to refund from escrow (when booking is cancelled)
walletSchema.methods.refundFromEscrow = async function (amount, bookingId) {
    if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    if (this.pendingBalance < amount) {
        throw new Error('Insufficient pending balance');
    }
    this.pendingBalance -= amount;
    await this.addTransaction({
        type: TransactionType.REFUND,
        amount,
        status: PaymentStatus.REFUNDED,
        booking: bookingId,
        description: 'Payment refunded to client',
    });
    return this;
};
// Method to get balance summary
walletSchema.methods.getBalance = function () {
    return {
        available: this.availableBalance,
        pending: this.pendingBalance,
        total: this.availableBalance + this.pendingBalance,
    };
};
// Method to check if user can withdraw
walletSchema.methods.canWithdraw = function (amount) {
    return this.availableBalance >= amount && amount > 0;
};
const Wallet = mongoose_1.default.model('Wallet', walletSchema);
exports.default = Wallet;
//# sourceMappingURL=Wallet.js.map