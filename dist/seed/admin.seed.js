"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmin = void 0;
// import mongoose from 'mongoose';
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const seedAdmin = async () => {
    try {
        const adminEmail = 'admin@example.com';
        const existingAdmin = await User_1.default.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin already exists');
            return;
        }
        const generateReferral = () => Math.random().toString(36).substring(2, 10).toUpperCase();
        const admin = new User_1.default({
            firstName: 'Super',
            lastName: 'Admin',
            email: adminEmail,
            phone: '0000000000',
            password: 'Admin@1234',
            role: types_1.UserRole.ADMIN,
            status: types_1.UserStatus.ACTIVE,
            isEmailVerified: true,
            isPhoneVerified: true,
            referralCode: generateReferral(),
            isVendor: false,
            walletBalance: 0,
        });
        await admin.save();
        console.log('Admin account created successfully');
    }
    catch (error) {
        console.error('Failed to seed admin:', error);
    }
};
exports.seedAdmin = seedAdmin;
//# sourceMappingURL=admin.seed.js.map