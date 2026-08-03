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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function unlock() {
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sharplook';
    await mongoose_1.default.connect(MONGO_URI);
    console.log('✅ Connected');
    const email = 'amara.okafor@glambyamara.ng';
    const newPassword = 'Vendor@2024';
    const hash = await bcryptjs_1.default.hash(newPassword, 10);
    const user = await User_1.default.findOneAndUpdate({ email }, {
        $set: { loginAttempts: 0, status: 'active', password: hash },
        $unset: { lockUntil: 1 },
    }, { new: true });
    if (!user) {
        console.log('❌ User not found:', email);
        process.exit(1);
    }
    // Verify the hash works (select password explicitly since it's excluded by default)
    const check = await User_1.default.findOne({ email }).select('+password');
    const ok = check ? await bcryptjs_1.default.compare(newPassword, check.password) : false;
    console.log(`✅ Unlocked & password reset: ${user.email}`);
    console.log(`   loginAttempts: ${user.loginAttempts}`);
    console.log(`   lockUntil:     ${user.lockUntil ?? 'none'}`);
    console.log(`   status:        ${user.status}`);
    console.log(`   password check: ${ok ? '✅ PASS' : '❌ FAIL'}`);
    process.exit(0);
}
unlock().catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=unlock.js.map