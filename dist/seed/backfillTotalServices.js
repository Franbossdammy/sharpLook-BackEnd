"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Service_1 = __importDefault(require("../models/Service"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
(async () => {
    const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';
    if (!uri) {
        console.error('❌ No MongoDB URI found in environment variables.');
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(uri);
        console.log('✅ Database connected');
        // Count non-deleted services per vendor in a single aggregation
        const counts = await Service_1.default.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: '$vendor', count: { $sum: 1 } } },
        ]);
        console.log(`📊 Found ${counts.length} vendors with services`);
        if (counts.length === 0) {
            console.log('Nothing to backfill.');
            process.exit(0);
        }
        // Build a bulkWrite that sets totalServices for every vendor that has services
        const bulkOps = counts.map(({ _id, count }) => ({
            updateOne: {
                filter: { _id },
                update: { $set: { 'vendorProfile.totalServices': count } },
            },
        }));
        const result = await User_1.default.bulkWrite(bulkOps, { ordered: false });
        console.log(`✅ Updated ${result.modifiedCount} vendor(s) with correct totalServices`);
        // Also zero-out vendors that have no services (in case field was previously set)
        const vendorIdsWithServices = counts.map(c => c._id);
        const zeroResult = await User_1.default.updateMany({
            isVendor: true,
            _id: { $nin: vendorIdsWithServices },
            'vendorProfile.totalServices': { $gt: 0 },
        }, { $set: { 'vendorProfile.totalServices': 0 } });
        if (zeroResult.modifiedCount > 0) {
            console.log(`🔄 Reset totalServices to 0 for ${zeroResult.modifiedCount} vendor(s) with no services`);
        }
        await mongoose_1.default.connection.close();
        console.log('✅ Migration complete. Database connection closed.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
})();
//# sourceMappingURL=backfillTotalServices.js.map