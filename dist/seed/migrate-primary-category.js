"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-time migration: set primaryCategory = categories[0] for every vendor
 * that has categories but no primaryCategory yet.
 *
 * Run with:  npx ts-node src/seed/migrate-primary-category.ts
 */
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri)
        throw new Error('MONGODB_URI not set in .env');
    await mongoose_1.default.connect(uri);
    console.log('Connected to MongoDB');
    const result = await mongoose_1.default.connection.collection('users').updateMany({
        isVendor: true,
        'vendorProfile.categories.0': { $exists: true },
        $or: [
            { 'vendorProfile.primaryCategory': { $exists: false } },
            { 'vendorProfile.primaryCategory': null },
        ],
    }, [
        {
            $set: {
                'vendorProfile.primaryCategory': { $arrayElemAt: ['$vendorProfile.categories', 0] },
            },
        },
    ]);
    console.log(`Migration complete. Vendors updated: ${result.modifiedCount}`);
    await mongoose_1.default.disconnect();
}
run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
//# sourceMappingURL=migrate-primary-category.js.map