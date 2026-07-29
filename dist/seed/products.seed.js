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
const dotenv = __importStar(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importStar(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
dotenv.config();
const VENDOR_EMAIL = 'seed@test.com';
const PRODUCTS = [
    {
        name: 'Essential Oil Diffuser',
        description: 'Premium ultrasonic essential oil diffuser with 7 LED colours and auto shut-off. Perfect for aromatherapy and relaxation at home.',
        price: 22000,
        compareAtPrice: 28000,
        stock: 45,
        brand: 'AromaCare',
        approvalStatus: 'approved',
        status: Product_1.ProductStatus.APPROVED,
        images: [
            'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=600&h=600&fit=crop',
        ],
        tags: ['diffuser', 'aromatherapy', 'wellness', 'home'],
    },
    {
        name: 'Argan Hair Oil',
        description: 'Pure Moroccan argan oil for silky, frizz-free hair. Lightweight formula that absorbs quickly without greasiness.',
        price: 10000,
        stock: 12,
        brand: 'GoldenRoots',
        approvalStatus: 'pending',
        status: Product_1.ProductStatus.PENDING,
        images: [
            'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=600&h=600&fit=crop',
        ],
        tags: ['hair', 'argan', 'oil', 'beauty'],
    },
    {
        name: 'Matte Lipstick Set',
        description: 'Long-lasting matte lipstick collection in 6 bold shades. Moisturising formula that stays put all day.',
        price: 7500,
        stock: 30,
        brand: 'GlowLab',
        approvalStatus: 'rejected',
        status: Product_1.ProductStatus.REJECTED,
        rejectionReason: 'Product images do not meet our quality standards. Please resubmit with clearer photos on a white background.',
        images: [
            'https://images.unsplash.com/photo-1586495777744-4e6232a0ac6b?w=600&h=600&fit=crop',
        ],
        tags: ['makeup', 'lipstick', 'matte', 'cosmetics'],
    },
    {
        name: 'Bath Bomb Set',
        description: 'Luxurious set of 8 handcrafted bath bombs infused with shea butter, essential oils and dried botanicals.',
        price: 15000,
        compareAtPrice: 18000,
        stock: 0,
        brand: 'BathBliss',
        approvalStatus: 'approved',
        status: Product_1.ProductStatus.OUT_OF_STOCK,
        images: [
            'https://images.unsplash.com/photo-1570194065650-d99fb4d8a609?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop',
        ],
        tags: ['bath', 'bomb', 'skincare', 'self-care'],
    },
    {
        name: 'Jade Roller Set',
        description: 'Authentic jade facial roller and gua sha set. Reduces puffiness, improves circulation and promotes lymphatic drainage.',
        price: 12500,
        stock: 8,
        brand: 'JadeGlow',
        approvalStatus: 'approved',
        status: Product_1.ProductStatus.APPROVED,
        images: [
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop',
        ],
        tags: ['jade', 'facial', 'roller', 'skincare'],
    },
    {
        name: 'Vitamin C Serum',
        description: '20% Vitamin C brightening serum with hyaluronic acid and ferulic acid. Fades dark spots and evens skin tone.',
        price: 18000,
        compareAtPrice: 22000,
        stock: 23,
        brand: 'ClearSkin',
        approvalStatus: 'approved',
        status: Product_1.ProductStatus.APPROVED,
        images: [
            'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=600&h=600&fit=crop',
        ],
        tags: ['serum', 'vitamin-c', 'brightening', 'skincare'],
    },
];
async function seedProducts() {
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sharplook';
    await mongoose_1.default.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    // ── Vendor ─────────────────────────────────────────────────────────────────
    const vendor = await User_1.default.findOne({ email: VENDOR_EMAIL });
    if (!vendor) {
        console.error(`❌ Vendor ${VENDOR_EMAIL} not found. Run dashboard.seed.ts first.`);
        process.exit(1);
    }
    console.log(`✅ Vendor found: ${vendor._id}`);
    // ── Category ───────────────────────────────────────────────────────────────
    let category = await Category_1.default.findOne({ name: 'Beauty & Wellness' });
    if (!category) {
        category = new Category_1.default({
            name: 'Beauty & Wellness',
            slug: 'beauty-wellness',
            description: 'Beauty and wellness products',
            icon: 'sparkles',
            isActive: true,
        });
        await category.save();
        console.log('✅ Category created');
    }
    // ── Wipe existing products for this vendor ─────────────────────────────────
    const deleted = await Product_1.default.deleteMany({ seller: vendor._id });
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing products`);
    // ── Insert products ────────────────────────────────────────────────────────
    let created = 0;
    for (const p of PRODUCTS) {
        const product = new Product_1.default({
            name: p.name,
            description: p.description,
            seller: vendor._id,
            sellerType: 'vendor',
            category: category._id,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            stock: p.stock,
            brand: p.brand,
            condition: Product_1.ProductCondition.NEW,
            approvalStatus: p.approvalStatus,
            status: p.status,
            rejectionReason: p.rejectionReason,
            images: p.images,
            tags: p.tags,
            isActive: true,
            deliveryOptions: {
                homeDelivery: true,
                pickup: true,
                estimatedDeliveryDays: 3,
                deliveryFee: 1500,
            },
            location: {
                type: 'Point',
                coordinates: [3.3792, 6.5244],
                address: '15 Allen Avenue',
                city: 'Ikeja',
                state: 'Lagos',
                country: 'Nigeria',
            },
        });
        await product.save();
        created++;
        console.log(`  ✅ ${p.name} [${p.approvalStatus}] stock:${p.stock}`);
    }
    console.log(`\n📦 ${created} products seeded for ${VENDOR_EMAIL}`);
    console.log('Run: npx ts-node src/seed/products.seed.ts');
    await mongoose_1.default.disconnect();
}
seedProducts().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=products.seed.js.map