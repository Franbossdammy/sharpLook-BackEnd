"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const vendors_seed_1 = require("./vendors.seed");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGODB_URI ||
    'mongodb+srv://kayskidadenusi:Luv2laf11_@cluster0.oo04lin.mongodb.net/?appName=Cluster0';
(async () => {
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log('✅ Database connected\n');
        await (0, vendors_seed_1.seedVendors)();
        await mongoose_1.default.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
})();
//# sourceMappingURL=runVendorSeed.js.map