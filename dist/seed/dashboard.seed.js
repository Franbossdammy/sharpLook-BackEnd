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
const Service_1 = __importDefault(require("../models/Service"));
const Category_1 = __importDefault(require("../models/Category"));
const types_1 = require("../types");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const VENDOR_EMAIL = 'seed@test.com';
const CLIENTS = [
    { firstName: 'Clara', lastName: 'Sarah', email: 'clara.sarah@test.com' },
    { firstName: 'Chioma', lastName: 'Okafor', email: 'chioma.okafor@test.com' },
    { firstName: 'Mary', lastName: 'Michael', email: 'mary.michael@test.com' },
    { firstName: 'Amaka', lastName: 'Eze', email: 'amaka.eze@test.com' },
    { firstName: 'Tola', lastName: 'Bello', email: 'tola.bello@test.com' },
    { firstName: 'Ngozi', lastName: 'Adeyemi', email: 'ngozi.adeyemi@test.com' },
];
const SERVICES_DATA = [
    { name: 'Natural Glam', description: 'Natural glam makeup for everyday looks', basePrice: 13000 },
    { name: 'Gel Nail Art', description: 'Premium gel nail art and extension services', basePrice: 20000 },
    { name: 'Deep Tissue Massage', description: 'Therapeutic deep tissue massage for relaxation', basePrice: 32000 },
    { name: 'Bridal Makeup', description: 'Full bridal makeup and styling for your special day', basePrice: 85000 },
    { name: 'Hair Braiding', description: 'Professional hair braiding — knotless, box braids', basePrice: 45000 },
];
const toSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
/** Return a Date for a specific day of the current week (0=Mon … 6=Sun) at a given hour */
const thisWeekDay = (weekDay, hour, minute = 0) => {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun…6=Sat
    const toMon = dow === 0 ? -6 : 1 - dow; // offset to Monday
    const d = new Date(now);
    d.setDate(now.getDate() + toMon + weekDay);
    d.setHours(hour, minute, 0, 0);
    return d;
};
/** Return a Date for a specific day of LAST week (0=Mon … 6=Sun) at a given hour */
const lastWeekDay = (weekDay, hour) => {
    const d = thisWeekDay(weekDay, hour);
    d.setDate(d.getDate() - 7);
    return d;
};
const todayAt = (hour, minute = 0) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
};
/** 24-hour format stored in DB: 9 → "09:00", 14 → "14:00" */
const formatTime = (h, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
/** Date N days in the future at a given hour */
const futureDay = (daysAhead, hour, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, minute, 0, 0);
    return d;
};
/** Insert bookings bypassing Mongoose timestamps so createdAt is preserved */
const rawInsert = async (docs) => {
    await mongoose_1.default.connection.collection('bookings').insertMany(docs);
};
async function seedDashboard() {
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sharplook';
    await mongoose_1.default.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    // ── 1. Vendor ──────────────────────────────────────────────────────────────
    let vendor = await User_1.default.findOne({ email: VENDOR_EMAIL });
    if (!vendor) {
        vendor = new User_1.default({
            firstName: 'Amara',
            lastName: 'Beauty',
            email: VENDOR_EMAIL,
            phone: '08012345678',
            password: 'Test@1234',
            role: types_1.UserRole.VENDOR,
            status: types_1.UserStatus.ACTIVE,
            isEmailVerified: true,
            isPhoneVerified: true,
            isVendor: true,
            referralCode: 'AMARA2026',
            avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face',
            walletBalance: 48000,
            vendorProfile: {
                businessName: 'Face By Amara',
                businessDescription: 'Premium beauty and wellness in Lagos. Makeup, nails, hair and body treatments.',
                vendorType: types_1.VendorType.BOTH,
                categories: [],
                location: {
                    type: 'Point',
                    coordinates: [3.3792, 6.5244],
                    address: '15 Allen Avenue',
                    city: 'Ikeja',
                    state: 'Lagos',
                    country: 'Nigeria',
                },
                serviceRadius: 20,
                rating: 4.9,
                totalRatings: 56,
                completedBookings: 74,
            },
        });
        await vendor.save();
        console.log('✅ Vendor created:', VENDOR_EMAIL);
    }
    else {
        vendor.walletBalance = 48000;
        if (!vendor.avatar)
            vendor.avatar = 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face';
        if (vendor.vendorProfile) {
            vendor.vendorProfile.rating = 4.9;
            vendor.vendorProfile.totalRatings = 56;
            vendor.vendorProfile.completedBookings = 74;
            if (!vendor.vendorProfile.businessName)
                vendor.vendorProfile.businessName = 'Face By Amara';
        }
        await vendor.save();
        console.log('✅ Vendor updated:', VENDOR_EMAIL);
    }
    // ── 2. Clients ─────────────────────────────────────────────────────────────
    const clientDocs = [];
    for (const c of CLIENTS) {
        let client = await User_1.default.findOne({ email: c.email });
        if (!client) {
            client = new User_1.default({
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email,
                phone: `0801${rand(1000000, 9999999)}`,
                password: 'Test@1234',
                role: types_1.UserRole.CLIENT,
                status: types_1.UserStatus.ACTIVE,
                isEmailVerified: true,
                isPhoneVerified: true,
                isVendor: false,
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                walletBalance: 0,
            });
            await client.save();
        }
        clientDocs.push(client);
    }
    console.log(`✅ ${clientDocs.length} clients ready`);
    // ── 3. Category ────────────────────────────────────────────────────────────
    let categoryDoc = await Category_1.default.findOne({ name: 'Beauty & Wellness' });
    if (!categoryDoc) {
        categoryDoc = new Category_1.default({
            name: 'Beauty & Wellness',
            slug: 'beauty-wellness',
            description: 'Beauty and wellness services',
            icon: 'sparkles',
            isActive: true,
        });
        await categoryDoc.save();
    }
    const categoryId = categoryDoc._id;
    // ── 4. Services ────────────────────────────────────────────────────────────
    const serviceDocs = [];
    for (const s of SERVICES_DATA) {
        let svc = await Service_1.default.findOne({ vendor: vendor._id, name: s.name });
        if (!svc) {
            svc = new Service_1.default({
                vendor: vendor._id,
                name: s.name,
                slug: `${toSlug(s.name)}-${vendor._id.toString().slice(-6)}`,
                description: s.description,
                category: categoryId,
                basePrice: s.basePrice,
                duration: 60,
                isActive: true,
                status: 'approved',
                approvalStatus: 'approved',
                location: {
                    type: 'Point',
                    coordinates: [3.3792, 6.5244],
                    address: '15 Allen Avenue, Ikeja, Lagos',
                    city: 'Ikeja',
                    state: 'Lagos',
                    country: 'Nigeria',
                },
            });
            await svc.save();
        }
        serviceDocs.push(svc);
    }
    console.log(`✅ ${serviceDocs.length} services ready`);
    // ── 5. Clear old bookings ──────────────────────────────────────────────────
    await mongoose_1.default.connection.collection('bookings').deleteMany({ vendor: vendor._id });
    console.log('🗑️  Cleared old bookings');
    const vendorId = vendor._id;
    const now = new Date();
    // ── 6. TODAY'S SCHEDULE (3 active bookings) ────────────────────────────────
    const todayEntries = [
        { client: clientDocs[0], service: serviceDocs[0], status: types_1.BookingStatus.PENDING, paymentStatus: 'pending', hour: 9, minute: 0, amount: 13000 },
        { client: clientDocs[1], service: serviceDocs[3], status: types_1.BookingStatus.ACCEPTED, paymentStatus: 'escrowed', hour: 11, minute: 30, amount: 85000 },
        { client: clientDocs[2], service: serviceDocs[2], status: types_1.BookingStatus.IN_PROGRESS, paymentStatus: 'escrowed', hour: 14, minute: 0, amount: 32000 },
    ];
    for (const e of todayEntries) {
        await mongoose_1.default.connection.collection('bookings').insertOne({
            _id: new mongoose_1.default.Types.ObjectId(),
            bookingType: types_1.BookingType.STANDARD,
            client: e.client._id,
            vendor: vendorId,
            service: e.service._id,
            scheduledDate: todayAt(e.hour, e.minute),
            scheduledTime: formatTime(e.hour, e.minute),
            totalAmount: e.amount,
            servicePrice: e.amount,
            distanceCharge: 0,
            status: e.status,
            paymentStatus: e.paymentStatus,
            statusHistory: [{ status: e.status, changedAt: new Date(), changedBy: e.client._id }],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    console.log(`✅ ${todayEntries.length} today bookings created`);
    // ── 7. THIS WEEK — completed bookings (Mon–yesterday) ─────────────────────
    //
    //   weekDay 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun
    //
    //   We only create bookings for days that have already passed this week.
    //   currentDow: 0=Sun, 1=Mon … 6=Sat  →  todayWeekDay (0=Mon…): Sun=6, Mon=0…
    const dow = now.getDay(); // 0=Sun…6=Sat
    const todayWeekDay = dow === 0 ? 6 : dow - 1; // 0=Mon … 6=Sun
    // Daily plans: (weekDay, amount, clientIdx, serviceIdx, hour)
    const weekPlan = [
        { wd: 0, amount: 85000, ci: 3, si: 3, hour: 10 }, // Mon — Bridal
        { wd: 0, amount: 13000, ci: 4, si: 0, hour: 15 }, // Mon — Natural Glam
        { wd: 1, amount: 45000, ci: 5, si: 4, hour: 11 }, // Tue — Hair Braiding
        { wd: 1, amount: 20000, ci: 0, si: 1, hour: 14 }, // Tue — Gel Nail
        { wd: 2, amount: 32000, ci: 1, si: 2, hour: 9 }, // Wed — Deep Tissue
        { wd: 2, amount: 85000, ci: 2, si: 3, hour: 13 }, // Wed — Bridal
        { wd: 2, amount: 13000, ci: 3, si: 0, hour: 16 }, // Wed — Natural Glam
        { wd: 3, amount: 45000, ci: 4, si: 4, hour: 10 }, // Thu — Hair Braiding
        { wd: 3, amount: 20000, ci: 5, si: 1, hour: 15 }, // Thu — Gel Nail
        { wd: 4, amount: 32000, ci: 0, si: 2, hour: 11 }, // Fri — Deep Tissue
        { wd: 4, amount: 85000, ci: 1, si: 3, hour: 14 }, // Fri — Bridal
        { wd: 5, amount: 45000, ci: 2, si: 4, hour: 10 }, // Sat — Hair Braiding
        { wd: 5, amount: 13000, ci: 3, si: 0, hour: 14 }, // Sat — Natural Glam
        { wd: 6, amount: 20000, ci: 4, si: 1, hour: 11 }, // Sun — Gel Nail
    ];
    const thisWeekDocs = [];
    for (const e of weekPlan) {
        // Only insert for days strictly before today (today has the active bookings above)
        if (e.wd >= todayWeekDay)
            continue;
        const createdAt = thisWeekDay(e.wd, e.hour);
        thisWeekDocs.push({
            _id: new mongoose_1.default.Types.ObjectId(),
            bookingType: types_1.BookingType.STANDARD,
            client: clientDocs[e.ci]._id,
            vendor: vendorId,
            service: serviceDocs[e.si]._id,
            scheduledDate: createdAt,
            scheduledTime: formatTime(e.hour),
            totalAmount: e.amount,
            servicePrice: e.amount,
            distanceCharge: 0,
            status: types_1.BookingStatus.COMPLETED,
            paymentStatus: 'released',
            completedAt: createdAt,
            statusHistory: [{ status: types_1.BookingStatus.COMPLETED, changedAt: createdAt, changedBy: clientDocs[e.ci]._id }],
            createdAt,
            updatedAt: createdAt,
        });
    }
    if (thisWeekDocs.length)
        await rawInsert(thisWeekDocs);
    console.log(`✅ ${thisWeekDocs.length} this-week completed bookings created`);
    // ── 8. LAST WEEK — completed bookings (Mon–Sun) for comparison analytics ──
    const lastWeekPlan = [
        { wd: 0, amount: 45000, ci: 0, si: 4, hour: 10 }, // Mon
        { wd: 0, amount: 13000, ci: 1, si: 0, hour: 14 }, // Mon
        { wd: 1, amount: 32000, ci: 2, si: 2, hour: 11 }, // Tue
        { wd: 2, amount: 85000, ci: 3, si: 3, hour: 9 }, // Wed
        { wd: 2, amount: 20000, ci: 4, si: 1, hour: 15 }, // Wed
        { wd: 3, amount: 45000, ci: 5, si: 4, hour: 10 }, // Thu
        { wd: 4, amount: 13000, ci: 0, si: 0, hour: 13 }, // Fri
        { wd: 5, amount: 32000, ci: 1, si: 2, hour: 10 }, // Sat
        { wd: 6, amount: 20000, ci: 2, si: 1, hour: 11 }, // Sun
    ];
    const lastWeekDocs = [];
    for (const e of lastWeekPlan) {
        const createdAt = lastWeekDay(e.wd, e.hour);
        lastWeekDocs.push({
            _id: new mongoose_1.default.Types.ObjectId(),
            bookingType: types_1.BookingType.STANDARD,
            client: clientDocs[e.ci]._id,
            vendor: vendorId,
            service: serviceDocs[e.si]._id,
            scheduledDate: createdAt,
            scheduledTime: formatTime(e.hour),
            totalAmount: e.amount,
            servicePrice: e.amount,
            distanceCharge: 0,
            status: types_1.BookingStatus.COMPLETED,
            paymentStatus: 'released',
            completedAt: createdAt,
            statusHistory: [{ status: types_1.BookingStatus.COMPLETED, changedAt: createdAt, changedBy: clientDocs[e.ci]._id }],
            createdAt,
            updatedAt: createdAt,
        });
    }
    await rawInsert(lastWeekDocs);
    console.log(`✅ ${lastWeekDocs.length} last-week completed bookings created`);
    // ── 9. ESCROWED bookings (wallet display) ─────────────────────────────────
    const escrowDocs = [
        { client: clientDocs[3], service: serviceDocs[3], amount: 8500, hour: 16 },
        { client: clientDocs[4], service: serviceDocs[1], amount: 6000, hour: 17 },
    ];
    for (const e of escrowDocs) {
        await mongoose_1.default.connection.collection('bookings').insertOne({
            _id: new mongoose_1.default.Types.ObjectId(),
            bookingType: types_1.BookingType.STANDARD,
            client: e.client._id,
            vendor: vendorId,
            service: e.service._id,
            scheduledDate: todayAt(e.hour),
            scheduledTime: formatTime(e.hour),
            totalAmount: e.amount,
            servicePrice: e.amount,
            distanceCharge: 0,
            status: types_1.BookingStatus.ACCEPTED,
            paymentStatus: 'escrowed',
            statusHistory: [{ status: types_1.BookingStatus.ACCEPTED, changedAt: new Date(), changedBy: e.client._id }],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    console.log('✅ Escrowed bookings created');
    // ── 10. FUTURE BOOKINGS (for countdown timer) ─────────────────────────────
    //   Soonest first so the countdown banner shows the nearest appointment.
    const futurePlan = [
        { daysAhead: 3, hour: 9, minute: 0, client: clientDocs[1], service: serviceDocs[0], status: types_1.BookingStatus.ACCEPTED, paymentStatus: 'escrowed', amount: 13000 }, // Chioma — Natural Glam  9:00 AM
        { daysAhead: 7, hour: 8, minute: 0, client: clientDocs[1], service: serviceDocs[1], status: types_1.BookingStatus.ACCEPTED, paymentStatus: 'escrowed', amount: 20000 }, // Chioma — Gel Nail Art  8:00 AM
        { daysAhead: 12, hour: 11, minute: 0, client: clientDocs[0], service: serviceDocs[4], status: types_1.BookingStatus.PENDING, paymentStatus: 'pending', amount: 45000 }, // Clara  — Hair Braiding 11:00 AM
        { daysAhead: 26, hour: 14, minute: 0, client: clientDocs[2], service: serviceDocs[3], status: types_1.BookingStatus.ACCEPTED, paymentStatus: 'escrowed', amount: 85000 }, // Mary   — Bridal Makeup  2:00 PM
    ];
    const futureDocs = futurePlan.map(e => ({
        _id: new mongoose_1.default.Types.ObjectId(),
        bookingType: types_1.BookingType.STANDARD,
        client: e.client._id,
        vendor: vendorId,
        service: e.service._id,
        scheduledDate: futureDay(e.daysAhead, e.hour, e.minute),
        scheduledTime: formatTime(e.hour, e.minute),
        totalAmount: e.amount,
        servicePrice: e.amount,
        distanceCharge: 0,
        status: e.status,
        paymentStatus: e.paymentStatus,
        location: {
            address: '24 Admiralty Way',
            city: 'Lekki',
            state: 'Lagos',
        },
        statusHistory: [{ status: e.status, changedAt: new Date(), changedBy: e.client._id }],
        createdAt: new Date(),
        updatedAt: new Date(),
    }));
    await rawInsert(futureDocs);
    console.log(`✅ ${futureDocs.length} future bookings created (countdown target: +3 days)`);
    // ── Summary ────────────────────────────────────────────────────────────────
    const thisWeekEarnings = thisWeekDocs.reduce((s, b) => s + b.totalAmount, 0);
    const lastWeekEarnings = lastWeekDocs.reduce((s, b) => s + b.totalAmount, 0);
    const escrowTotal = escrowDocs.reduce((s, e) => s + e.amount, 0);
    console.log('\n📊 Seed Summary:');
    console.log(`   Vendor:          ${VENDOR_EMAIL}`);
    console.log(`   Wallet balance:  ₦48,000`);
    console.log(`   In escrow:       ₦${escrowTotal.toLocaleString()}`);
    console.log(`   This week:       ${thisWeekDocs.length} bookings → ₦${thisWeekEarnings.toLocaleString()}`);
    console.log(`   Last week:       ${lastWeekDocs.length} bookings → ₦${lastWeekEarnings.toLocaleString()}`);
    console.log(`   Today schedule:  ${todayEntries.length} active bookings`);
    console.log('\n✅ Dashboard seed complete! Run: npx ts-node src/seed/dashboard.seed.ts');
    await mongoose_1.default.disconnect();
}
seedDashboard().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=dashboard.seed.js.map