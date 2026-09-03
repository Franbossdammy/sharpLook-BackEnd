"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
/**
 * Testing helper: deletes ALL bookings that used a promo, rolling back
 * client/vendor wallet balances and removing related payment + transaction
 * records so the DB is clean for a fresh retest. DO NOT run in prod.
 *
 * Usage:
 *   npx ts-node src/seed/cleanupPromoTestBookings.ts            # dry run - shows what would happen
 *   npx ts-node src/seed/cleanupPromoTestBookings.ts --commit   # actually delete
 */
(async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri)
            throw new Error('MONGODB_URI not set');
        await mongoose_1.default.connect(uri);
        const commit = process.argv.includes('--commit');
        const bookings = await Booking_1.default.find({ promoApplied: true });
        if (bookings.length === 0) {
            console.log('No promo bookings found. Nothing to clean.');
            await mongoose_1.default.connection.close();
            process.exit(0);
        }
        console.log(`Found ${bookings.length} promo booking(s):`);
        console.log(commit ? '  Mode: COMMIT (will delete)\n' : '  Mode: DRY RUN (use --commit to apply)\n');
        for (const b of bookings) {
            console.log(`Booking ${b._id}`);
            console.log(`  status=${b.status}  paymentStatus=${b.paymentStatus}`);
            console.log(`  client=${b.client}  vendor=${b.vendor}`);
            console.log(`  servicePrice=N${b.servicePrice}  distanceCharge=N${b.distanceCharge}`);
            console.log(`  totalAmount(client paid)=N${b.totalAmount}  promoDiscount=N${b.promoDiscount}  promoBonusAmount=N${b.promoBonusAmount}`);
            const payment = b.paymentId
                ? await Payment_1.default.findById(b.paymentId)
                : await Payment_1.default.findOne({ booking: b._id });
            console.log(`  payment=${payment?._id ?? 'none'}  paymentMethod=${payment?.paymentMethod ?? '-'}`);
            const txns = await Transaction_1.default.find({ booking: b._id });
            console.log(`  transactions: ${txns.length}`);
            for (const t of txns) {
                console.log(`    - ${t.type}  amount=N${t.amount}  user=${t.user}`);
            }
            if (!commit) {
                console.log('  (dry run - skipping mutations)\n');
                continue;
            }
            // Roll back wallet balances
            // Client: refund what they paid IF they paid via wallet (already deducted from wallet)
            if (payment?.paymentMethod === 'wallet' && b.paymentStatus !== 'refunded') {
                const client = await User_1.default.findById(b.client);
                if (client) {
                    const before = client.walletBalance || 0;
                    client.walletBalance = before + b.totalAmount;
                    await client.save();
                    console.log(`  -> Client wallet: N${before} -> N${client.walletBalance} (+N${b.totalAmount})`);
                }
            }
            // Vendor: debit whatever was credited at completion (only if released)
            if (b.paymentStatus === 'released') {
                const vendor = await User_1.default.findById(b.vendor);
                if (vendor) {
                    const creditedEarning = payment?.vendorAmount ?? 0;
                    const creditedBonus = b.promoBonusAmount || 0;
                    const totalCredited = creditedEarning + creditedBonus;
                    const before = vendor.walletBalance || 0;
                    vendor.walletBalance = Math.max(0, before - totalCredited);
                    await vendor.save();
                    console.log(`  -> Vendor wallet: N${before} -> N${vendor.walletBalance} (-N${totalCredited})`);
                }
            }
            // Delete transactions, payment, booking (hard delete)
            if (txns.length) {
                await Transaction_1.default.deleteMany({ booking: b._id });
                console.log(`  -> Deleted ${txns.length} transaction(s)`);
            }
            if (payment) {
                await Payment_1.default.deleteOne({ _id: payment._id });
                console.log(`  -> Deleted payment ${payment._id}`);
            }
            await Booking_1.default.deleteOne({ _id: b._id });
            console.log(`  -> Deleted booking ${b._id}\n`);
        }
        await mongoose_1.default.connection.close();
        console.log('Done.');
        process.exit(0);
    }
    catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
//# sourceMappingURL=cleanupPromoTestBookings.js.map