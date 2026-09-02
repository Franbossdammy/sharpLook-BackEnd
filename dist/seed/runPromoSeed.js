"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const PromoCampaign_1 = __importDefault(require("../models/PromoCampaign"));
dotenv_1.default.config();
(async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri)
            throw new Error('MONGODB_URI not set in .env');
        await mongoose_1.default.connect(uri);
        console.log('Database connected');
        const existing = await PromoCampaign_1.default.findOne({ isActive: true });
        if (existing) {
            console.log(`Active promo already exists: ${existing.name} (${existing._id})`);
            console.log(`  slotsRemaining: ${existing.slotsRemaining} / ${existing.maxSlots}`);
            await mongoose_1.default.connection.close();
            process.exit(0);
        }
        const campaign = await PromoCampaign_1.default.create({
            name: 'Launch Promo (local test)',
            description: 'Local test campaign - 5 slots for testing the promo flow end-to-end',
            isActive: true,
            discountAmount: 3000,
            vendorBonusAmount: 2000,
            minServicePrice: 10000,
            maxSlots: 5,
            slotsRemaining: 5,
            maxUsesPerUser: 1,
            appliesTo: 'ALL',
            redemptions: [],
        });
        console.log('Promo campaign created:');
        console.log(`  _id: ${campaign._id}`);
        console.log(`  name: ${campaign.name}`);
        console.log(`  slots: ${campaign.slotsRemaining} / ${campaign.maxSlots}`);
        console.log(`  discount: N${campaign.discountAmount}  vendorBonus: N${campaign.vendorBonusAmount}`);
        console.log(`  minServicePrice: N${campaign.minServicePrice}`);
        await mongoose_1.default.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error running promo seed:', error);
        process.exit(1);
    }
})();
//# sourceMappingURL=runPromoSeed.js.map