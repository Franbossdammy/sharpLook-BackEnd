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
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function check() {
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sharplook';
    await mongoose_1.default.connect(MONGO_URI);
    console.log('✅ Connected');
    const vendor = await User_1.default.findOne({ email: 'seed@test.com' });
    if (!vendor) {
        console.log('❌ Vendor not found');
        process.exit(1);
    }
    console.log(`✅ Vendor _id: ${vendor._id}`);
    const total = await Booking_1.default.countDocuments({ vendor: vendor._id });
    console.log(`📦 Total bookings for vendor: ${total}`);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const todayByScheduled = await Booking_1.default.find({
        vendor: vendor._id,
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
    }, 'scheduledDate scheduledTime status totalAmount');
    console.log(`\n📅 Today's bookings (by scheduledDate):`);
    console.log(`   todayStart: ${todayStart.toISOString()}`);
    console.log(`   todayEnd:   ${todayEnd.toISOString()}`);
    console.log(`   Found: ${todayByScheduled.length}`);
    todayByScheduled.forEach(b => console.log(`   - ${b.scheduledTime} | ${b.status} | ₦${b.totalAmount} | scheduledDate: ${b.scheduledDate?.toISOString()}`));
    const allSample = await Booking_1.default.find({ vendor: vendor._id }, 'scheduledDate status createdAt').limit(5);
    console.log(`\n🔍 Sample of 5 bookings (any status):`);
    allSample.forEach(b => {
        console.log(`   status=${b.status} | scheduledDate=${b.scheduledDate?.toISOString()} | createdAt=${b.createdAt?.toISOString()}`);
    });
    await mongoose_1.default.disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=check.seed.js.map