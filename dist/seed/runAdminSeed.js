"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const admin_seed_1 = require("./admin.seed");
dotenv_1.default.config();
(async () => {
    try {
        await mongoose_1.default.connect("mongodb+srv://kayskidadenusi:Luv2laf11_@cluster0.oo04lin.mongodb.net/?appName=Cluster0");
        console.log('Database connected');
        await (0, admin_seed_1.seedAdmin)();
        await mongoose_1.default.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error running seed:', error);
        process.exit(1);
    }
})();
//# sourceMappingURL=runAdminSeed.js.map