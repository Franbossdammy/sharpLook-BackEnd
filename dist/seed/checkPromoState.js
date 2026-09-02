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
            throw new Error('MONGODB_URI not set');
        await mongoose_1.default.connect(uri);
        const campaigns = await PromoCampaign_1.default.find().sort({ createdAt: -1 }).limit(5);
        if (campaigns.length === 0) {
            console.log('NO CAMPAIGNS in DB.');
        }
        else {
            console.log(`Found ${campaigns.length} campaign(s):\n`);
            for (const c of campaigns) {
                console.log(`  _id: ${c._id}`);
                console.log(`  name: ${c.name}`);
                console.log(`  isActive: ${c.isActive}`);
                console.log(`  slots: ${c.slotsRemaining} / ${c.maxSlots}`);
                console.log(`  minServicePrice: N${c.minServicePrice}  discount: N${c.discountAmount}`);
                console.log(`  maxUsesPerUser: ${c.maxUsesPerUser}`);
                console.log(`  redemptions: ${c.redemptions.length}`);
                for (const r of c.redemptions) {
                    console.log(`    - user=${r.user}  booking=${r.booking}  refundedAt=${r.refundedAt || 'no'}`);
                }
                console.log('');
            }
        }
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
//# sourceMappingURL=checkPromoState.js.map