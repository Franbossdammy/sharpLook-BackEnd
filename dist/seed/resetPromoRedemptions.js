"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const PromoCampaign_1 = __importDefault(require("../models/PromoCampaign"));
dotenv_1.default.config();
/**
 * Testing helper: clears redemptions from the active campaign so a test user
 * isn't permanently blocked. DO NOT run in prod — bypasses the
 * "refunded still counts" rule and (with --all) even wipes valid redemptions.
 *
 * Usage:
 *   npx ts-node src/seed/resetPromoRedemptions.ts          # only refunded
 *   npx ts-node src/seed/resetPromoRedemptions.ts --all    # ALL redemptions + restore slots
 */
(async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri)
            throw new Error('MONGODB_URI not set');
        await mongoose_1.default.connect(uri);
        const wipeAll = process.argv.includes('--all');
        const campaign = await PromoCampaign_1.default.findOne({ isActive: true });
        if (!campaign) {
            console.log('No active campaign found.');
            await mongoose_1.default.connection.close();
            process.exit(0);
        }
        const beforeCount = campaign.redemptions.length;
        const refundedCount = campaign.redemptions.filter((r) => r.refundedAt).length;
        const activeCount = beforeCount - refundedCount;
        if (wipeAll) {
            campaign.redemptions = [];
            campaign.slotsRemaining = campaign.maxSlots;
        }
        else {
            campaign.redemptions = campaign.redemptions.filter((r) => !r.refundedAt);
        }
        await campaign.save();
        console.log(`Campaign: ${campaign.name} (${campaign._id})`);
        if (wipeAll) {
            console.log(`  Mode: --all (wiped everything, restored slots)`);
            console.log(`  Removed ${refundedCount} refunded + ${activeCount} active redemption(s).`);
        }
        else {
            console.log(`  Mode: refunded-only`);
            console.log(`  Removed ${refundedCount} refunded redemption(s).`);
        }
        console.log(`  Redemptions: ${beforeCount} -> ${campaign.redemptions.length}`);
        console.log(`  Slots: ${campaign.slotsRemaining} / ${campaign.maxSlots}`);
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
//# sourceMappingURL=resetPromoRedemptions.js.map