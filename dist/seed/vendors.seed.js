"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedVendors = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const Category_1 = __importDefault(require("../models/Category"));
const Service_1 = __importDefault(require("../models/Service"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Review_1 = __importDefault(require("../models/Review"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const types_1 = require("../types");
// ── Image pools (stable Unsplash CDN) ─────────────────────────────────────────
const PROFILE_IMGS = [
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
    'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=600&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&q=80',
];
const COVER_IMGS = [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80',
    'https://images.unsplash.com/photo-1487088678257-3a541e6e3922?w=800&q=80',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80',
    'https://images.unsplash.com/photo-1522337094090-37b3a5f9eb3e?w=800&q=80',
    'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=800&q=80',
    'https://images.unsplash.com/photo-1492681290082-e932832941e6?w=800&q=80',
    'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=800&q=80',
];
const PORTFOLIO_POOLS = {
    makeup: [
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
        'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&q=80',
        'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&q=80',
        'https://images.unsplash.com/photo-1600096194101-172df756dfd5?w=400&q=80',
        'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80',
        'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&q=80',
    ],
    hair: [
        'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80',
        'https://images.unsplash.com/photo-1605497787035-cee08b7d8d7a?w=400&q=80',
        'https://images.unsplash.com/photo-1522337094090-37b3a5f9eb3e?w=400&q=80',
        'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80',
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&q=80',
    ],
    nails: [
        'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80',
        'https://images.unsplash.com/photo-1604655804487-60ebf21d09a5?w=400&q=80',
        'https://images.unsplash.com/photo-1604655804880-6ade7e3f3d97?w=400&q=80',
        'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&q=80',
        'https://images.unsplash.com/photo-1604655805433-3dc695ade1a3?w=400&q=80',
    ],
    spa: [
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
        'https://images.unsplash.com/photo-1520006403909-838d6b92c22e?w=400&q=80',
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80',
        'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80',
    ],
};
const rand = () => Math.random().toString(36).substring(2, 10).toUpperCase();
const hashPassword = async (pw) => bcryptjs_1.default.hash(pw, 10);
// ── Vendor definitions ─────────────────────────────────────────────────────────
const VENDOR_DEFS = [
    {
        firstName: 'Amara', lastName: 'Okafor',
        email: 'amara.okafor@glambyamara.ng',
        phone: '08011110001',
        businessName: 'Glam by Amara',
        businessDescription: 'Premium bridal and occasion makeup services delivered to your doorstep anywhere in Lagos. Over 8 years of experience creating flawless looks.',
        vendorType: types_1.VendorType.HOME_SERVICE,
        city: 'Lagos Island', state: 'Lagos',
        rating: 4.9, totalRatings: 213, totalReviews: 213,
        completedBookings: 340,
        isVerified: true,
        profileIdx: 0, coverIdx: 0,
        portfolioKey: 'makeup',
        totalServices: 4,
        startingPrice: 45000,
        services: [
            { name: 'Bridal Makeup', price: 85000, duration: 180, description: 'Full bridal glam including hair trial, airbrush foundation, and 8-hour long-lasting finish.', bookings: 120, views: 890 },
            { name: 'Event / Party Makeup', price: 45000, duration: 120, description: 'Glamorous makeup for parties, birthdays, and corporate events. Includes lashes and setting spray.', bookings: 145, views: 1200 },
            { name: 'Natural Beat', price: 35000, duration: 90, description: 'Clean, flawless natural makeup look. Perfect for work, dates, and casual occasions.', bookings: 60, views: 430 },
            { name: 'Makeup Lesson (1-on-1)', price: 55000, duration: 120, description: 'Private makeup tutorial tailored to your skin type, features, and goals.', bookings: 15, views: 210 },
        ],
    },
    {
        firstName: 'Chidinma', lastName: 'Eze',
        email: 'chidinma@crownhairstudio.ng',
        phone: '08011110002',
        businessName: 'The Crown Hair Studio',
        businessDescription: 'Award-winning hair studio on Victoria Island specialising in natural hair care, protective styles, and keratin treatments.',
        vendorType: types_1.VendorType.IN_SHOP,
        city: 'Victoria Island', state: 'Lagos',
        rating: 4.7, totalRatings: 178, totalReviews: 178,
        completedBookings: 290,
        isVerified: true,
        profileIdx: 1, coverIdx: 1,
        portfolioKey: 'hair',
        totalServices: 4,
        startingPrice: 25000,
        services: [
            { name: 'Knotless Box Braids', price: 60000, duration: 360, description: 'Pain-free knotless braids using premium human hair blend. Includes shampoo and blow-dry.', bookings: 95, views: 760 },
            { name: 'Natural Hair Treatment', price: 25000, duration: 90, description: 'Deep conditioning, protein treatment, and steam therapy for healthy natural hair.', bookings: 85, views: 540 },
            { name: 'Keratin Smoothing', price: 75000, duration: 180, description: 'Brazilian keratin treatment for silky, frizz-free hair lasting 3-5 months.', bookings: 60, views: 430 },
            { name: 'Ghana Weaving', price: 35000, duration: 120, description: 'Neat and stylish Ghana weaving in any pattern. Protective and long-lasting.', bookings: 50, views: 320 },
        ],
    },
    {
        firstName: 'Lola', lastName: 'Adeyemi',
        email: 'lola@lolanailspa.ng',
        phone: '08011110003',
        businessName: "Lola's Nail Bar",
        businessDescription: 'Lekki\'s most loved nail studio offering gel, acrylic, nail art, and luxury pedicures in a chic, relaxing environment.',
        vendorType: types_1.VendorType.IN_SHOP,
        city: 'Lekki Phase 1', state: 'Lagos',
        rating: 4.8, totalRatings: 302, totalReviews: 302,
        completedBookings: 520,
        isVerified: true,
        profileIdx: 2, coverIdx: 2,
        portfolioKey: 'nails',
        totalServices: 5,
        startingPrice: 12000,
        services: [
            { name: 'Gel Manicure', price: 18000, duration: 60, description: 'Long-lasting gel polish with cuticle care, nail shaping, and hand massage.', bookings: 200, views: 1560 },
            { name: 'Acrylic Full Set', price: 35000, duration: 90, description: 'Full acrylic nail extension with any shape (coffin, almond, stiletto, square).', bookings: 130, views: 980 },
            { name: 'Nail Art (per nail)', price: 12000, duration: 60, description: '3D nail art, chrome powder, encapsulated designs, florals, and custom requests.', bookings: 95, views: 740 },
            { name: 'Luxury Pedicure', price: 22000, duration: 75, description: 'Soak, exfoliation, callus removal, massage, and gel polish. Pure bliss.', bookings: 78, views: 510 },
            { name: 'Dip Powder Nails', price: 28000, duration: 75, description: 'Odorless, lightweight dip powder nails. Stronger than gel and lasts 4-6 weeks.', bookings: 17, views: 210 },
        ],
    },
    {
        firstName: 'Ngozi', lastName: 'Anyanwu',
        email: 'ngozi@serenityspa.ng',
        phone: '08011110004',
        businessName: 'Serenity Beauty Spa',
        businessDescription: 'A tranquil luxury spa in Ikoyi offering holistic beauty treatments, massages, and advanced skincare. Your retreat in the city.',
        vendorType: types_1.VendorType.IN_SHOP,
        city: 'Ikoyi', state: 'Lagos',
        rating: 4.6, totalRatings: 145, totalReviews: 145,
        completedBookings: 230,
        isVerified: true,
        profileIdx: 3, coverIdx: 3,
        portfolioKey: 'spa',
        totalServices: 4,
        startingPrice: 35000,
        services: [
            { name: 'Full Body Massage', price: 55000, duration: 90, description: 'Swedish or deep tissue full body massage with warm oils and aromatherapy.', bookings: 80, views: 620 },
            { name: 'HydraFacial', price: 75000, duration: 75, description: 'Medical-grade facial with cleansing, exfoliation, extraction, hydration, and antioxidants.', bookings: 65, views: 480 },
            { name: 'Body Scrub & Wrap', price: 45000, duration: 90, description: 'Full body sugar scrub followed by a nourishing body wrap and rinse. Leaves skin glowing.', bookings: 50, views: 390 },
            { name: 'Deluxe Facial', price: 35000, duration: 60, description: 'Deep cleansing facial with steam, extractions, toning, and custom mask.', bookings: 35, views: 280 },
        ],
    },
    {
        firstName: 'Fatima', lastName: 'Bello',
        email: 'fatima@browboss.ng',
        phone: '08011110005',
        businessName: 'Brow Boss by Fatima',
        businessDescription: 'Nigeria\'s top brow and lash specialist. Microblading, ombré brows, and lash extensions that look completely natural.',
        vendorType: types_1.VendorType.HOME_SERVICE,
        city: 'Ajah', state: 'Lagos',
        rating: 4.9, totalRatings: 267, totalReviews: 267,
        completedBookings: 410,
        isVerified: true,
        profileIdx: 4, coverIdx: 4,
        portfolioKey: 'makeup',
        totalServices: 4,
        startingPrice: 18000,
        services: [
            { name: 'Microblading', price: 85000, duration: 150, description: 'Semi-permanent brow tattoo technique for natural hair-stroke brows. Lasts 12-18 months.', bookings: 150, views: 1230 },
            { name: 'Ombré Powder Brows', price: 95000, duration: 150, description: 'Soft, powdery brows with a gradient effect. Ideal for oily skin. Lasts up to 2 years.', bookings: 120, views: 980 },
            { name: 'Classic Lash Extensions', price: 25000, duration: 120, description: 'Individual silk lash extensions for a natural yet defined look. Fills every 2-3 weeks.', bookings: 110, views: 840 },
            { name: 'Volume Lash Set', price: 35000, duration: 150, description: '2D-6D volume lashes for a dramatic, full look. Great for special occasions.', bookings: 30, views: 420 },
        ],
    },
    {
        firstName: 'Zara', lastName: 'Ibrahim',
        email: 'zara@zaraskin.ng',
        phone: '08011110006',
        businessName: 'Zara Skin Clinic',
        businessDescription: 'Advanced skincare clinic offering medical-grade treatments, chemical peels, laser therapy, and personalised skin regimens.',
        vendorType: types_1.VendorType.BOTH,
        city: 'Maryland', state: 'Lagos',
        rating: 4.7, totalRatings: 189, totalReviews: 189,
        completedBookings: 315,
        isVerified: true,
        profileIdx: 5, coverIdx: 5,
        portfolioKey: 'spa',
        totalServices: 4,
        startingPrice: 40000,
        services: [
            { name: 'Chemical Peel', price: 55000, duration: 60, description: 'Professional chemical peel targeting acne scars, hyperpigmentation, and uneven tone.', bookings: 95, views: 780 },
            { name: 'Acne Treatment', price: 40000, duration: 75, description: 'Targeted acne treatment with LED therapy, extractions, and prescribed homecare.', bookings: 110, views: 870 },
            { name: 'Skin Consultation & Routine', price: 25000, duration: 45, description: 'Full skin analysis with customised product recommendations and morning/night routine plan.', bookings: 70, views: 540 },
            { name: 'Vitamin C Brightening Facial', price: 50000, duration: 60, description: 'High-potency vitamin C infusion facial for radiance, firming, and dark spot correction.', bookings: 40, views: 310 },
        ],
    },
    {
        firstName: 'Adaeze', lastName: 'Nwosu',
        email: 'adaeze@glamourtouch.ng',
        phone: '08011110007',
        businessName: 'Glamour Touch Studios',
        businessDescription: 'Full-service beauty studio in Ikeja GRA. We do makeup, styling, brows, and lashes — all under one roof.',
        vendorType: types_1.VendorType.BOTH,
        city: 'Ikeja GRA', state: 'Lagos',
        rating: 4.5, totalRatings: 134, totalReviews: 134,
        completedBookings: 210,
        isVerified: false,
        profileIdx: 6, coverIdx: 6,
        portfolioKey: 'makeup',
        totalServices: 3,
        startingPrice: 30000,
        services: [
            { name: 'Full Glam Makeup', price: 45000, duration: 120, description: 'Complete glam transformation — contouring, highlighted eyes, full coverage, and lashes.', bookings: 90, views: 710 },
            { name: 'Airbrush Makeup', price: 60000, duration: 120, description: 'Flawless airbrushed finish using professional airbrush gun. Long-lasting and photo-ready.', bookings: 75, views: 580 },
            { name: 'Gele Tying', price: 30000, duration: 60, description: 'Expert traditional Nigerian Gele tying in all styles for any occasion.', bookings: 45, views: 350 },
        ],
    },
    {
        firstName: 'Ayomide', lastName: 'Sanni',
        email: 'ayomide@ayomidehair.ng',
        phone: '08011110008',
        businessName: 'Ayomide Hair Gallery',
        businessDescription: 'Surulere\'s premier hair destination offering weaves, wigs, natural styles, and colour treatments for all hair types.',
        vendorType: types_1.VendorType.IN_SHOP,
        city: 'Surulere', state: 'Lagos',
        rating: 4.8, totalRatings: 221, totalReviews: 221,
        completedBookings: 380,
        isVerified: true,
        profileIdx: 7, coverIdx: 7,
        portfolioKey: 'hair',
        totalServices: 4,
        startingPrice: 20000,
        services: [
            { name: 'Full Weave Installation', price: 55000, duration: 180, description: 'Professional weave sew-in with cornrow base, closure or frontal install, and styling.', bookings: 130, views: 1020 },
            { name: 'Wig Customisation & Install', price: 40000, duration: 120, description: 'Bleach knots, pluck hairline, and glue-down or sew-down wig installation.', bookings: 95, views: 750 },
            { name: 'Hair Colour & Highlights', price: 65000, duration: 180, description: 'Balayage, highlights, ombre, or full colour using Schwarzkopf professional products.', bookings: 80, views: 620 },
            { name: 'Crochet Braids', price: 20000, duration: 90, description: 'Lightweight crochet braids in faux locs, passion twists, senegalese twists, or curls.', bookings: 75, views: 480 },
        ],
    },
];
// ── Review comments ─────────────────────────────────────────────────────────────
const REVIEWS = [
    { rating: 5, comment: "Absolutely stunning work! Everyone at the event kept asking about my makeup. I'll definitely be back." },
    { rating: 5, comment: "Professional, punctual, and so talented. The results exceeded my expectations completely." },
    { rating: 5, comment: "I cried when I saw how beautiful I looked on my wedding day. Worth every kobo." },
    { rating: 4, comment: "Really great service! Came to my house on time and the setup was so professional. Minor improvement on the packaging would be perfect." },
    { rating: 5, comment: "Best in Lagos, hands down. My skin has never looked this good. Can't stop getting compliments." },
    { rating: 5, comment: "Booked for my birthday party. She transformed me into a goddess! The pictures are fire." },
    { rating: 4, comment: "Loved the result! Was a bit long but totally worth it. Will rebook." },
    { rating: 5, comment: "Super clean studio, amazing service, and great music. This is my new self-care spot." },
    { rating: 5, comment: "Microblading changed my life. I wake up with perfect brows every day. Totally painless too!" },
    { rating: 4, comment: "Great experience overall. Friendly team and quality products. Highly recommend." },
];
// ── Main seed function ─────────────────────────────────────────────────────────
const seedVendors = async () => {
    console.log('🌱 Starting vendor seed...');
    // 1. Ensure categories exist
    const categoryDefs = [
        { name: 'Makeup', slug: 'makeup', description: 'Professional makeup and beauty services', order: 1 },
        { name: 'Hair', slug: 'hair', description: 'Hair styling, braiding, weaving, and treatments', order: 2 },
        { name: 'Nails', slug: 'nails', description: 'Nail art, gel, acrylic, and nail care', order: 3 },
        { name: 'Spa & Massage', slug: 'spa-massage', description: 'Relaxing spa treatments and body massages', order: 4 },
        { name: 'Brows & Lashes', slug: 'brows-lashes', description: 'Microblading, lash extensions, and brow shaping', order: 5 },
        { name: 'Skincare', slug: 'skincare', description: 'Facials, peels, and advanced skincare treatments', order: 6 },
        { name: 'Gele & Styling', slug: 'gele-styling', description: 'Traditional Nigerian headtie and fashion styling', order: 7 },
    ];
    const catMap = {};
    for (const cd of categoryDefs) {
        let cat = await Category_1.default.findOne({ slug: cd.slug });
        if (!cat) {
            cat = await Category_1.default.create({ ...cd, isActive: true, isDeleted: false });
            console.log(`  ✅ Created category: ${cd.name}`);
        }
        catMap[cd.slug] = cat._id;
    }
    // Helper to pick category for a vendor
    const getVendorCategories = (_vendorName, portfolioKey) => {
        const map = {
            makeup: ['makeup'],
            hair: ['hair'],
            nails: ['nails'],
            spa: ['spa-massage', 'skincare'],
        };
        return (map[portfolioKey] || ['makeup']).map(slug => catMap[slug]).filter(Boolean);
    };
    // 2. Create test client (if not exists)
    let testClient = await User_1.default.findOne({ email: 'testclient@sharplook.com' });
    if (!testClient) {
        testClient = await User_1.default.create({
            firstName: 'Test',
            lastName: 'Client',
            email: 'testclient@sharplook.com',
            phone: '08099990001',
            password: await hashPassword('TestClient@2024'),
            role: types_1.UserRole.CLIENT,
            status: types_1.UserStatus.ACTIVE,
            isEmailVerified: true,
            isPhoneVerified: true,
            referralCode: rand(),
            isVendor: false,
            walletBalance: 0,
            isDeleted: false,
        });
        console.log('  ✅ Created test client: testclient@sharplook.com / TestClient@2024');
    }
    // 3. Create vendors
    for (let vi = 0; vi < VENDOR_DEFS.length; vi++) {
        const vd = VENDOR_DEFS[vi];
        const existing = await User_1.default.findOne({ email: vd.email });
        if (existing) {
            console.log(`  ⏭  Vendor already exists: ${vd.businessName}`);
            continue;
        }
        const portfolioImgs = PORTFOLIO_POOLS[vd.portfolioKey].slice(0, 5);
        const vendorCategories = getVendorCategories(vd.businessName, vd.portfolioKey);
        const vendor = await User_1.default.create({
            firstName: vd.firstName,
            lastName: vd.lastName,
            email: vd.email,
            phone: vd.phone,
            password: await hashPassword('Vendor@2024'),
            role: types_1.UserRole.VENDOR,
            status: types_1.UserStatus.ACTIVE,
            isEmailVerified: true,
            isPhoneVerified: true,
            referralCode: rand(),
            isVendor: true,
            walletBalance: 0,
            avatar: PROFILE_IMGS[vd.profileIdx],
            isDeleted: false,
            vendorProfile: {
                businessName: vd.businessName,
                businessDescription: vd.businessDescription,
                vendorType: vd.vendorType,
                categories: vendorCategories,
                primaryCategory: vendorCategories[0],
                location: {
                    type: 'Point',
                    coordinates: [3.3792 + (vi * 0.02), 6.5244 + (vi * 0.02)],
                    address: `${10 + vi} Adeyemo Alakija Street`,
                    city: vd.city,
                    state: vd.state,
                    country: 'Nigeria',
                },
                serviceRadius: 15,
                rating: vd.rating,
                totalRatings: vd.totalRatings,
                totalReviews: vd.totalReviews,
                completedBookings: vd.completedBookings,
                isVerified: vd.isVerified,
                verificationDate: vd.isVerified ? new Date('2024-01-15') : undefined,
                kycStatus: 'approved',
                totalServices: vd.totalServices,
                profileImage: PROFILE_IMGS[vd.profileIdx],
                coverImage: COVER_IMGS[vd.coverIdx],
                portfolioImages: portfolioImgs,
            },
        });
        console.log(`  ✅ Created vendor: ${vd.businessName}`);
        // 4. Create subscription for vendor
        const subType = vd.vendorType === types_1.VendorType.IN_SHOP ? 'in_shop' :
            vd.vendorType === types_1.VendorType.HOME_SERVICE ? 'home_service' : 'both';
        await Subscription_1.default.create({
            vendor: vendor._id,
            type: subType,
            plan: 'pro',
            monthlyFee: vd.vendorType === types_1.VendorType.HOME_SERVICE ? 0 : 5000,
            commissionRate: vd.vendorType === types_1.VendorType.HOME_SERVICE ? 10 : vd.vendorType === types_1.VendorType.BOTH ? 12 : 0,
            status: 'active',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2027-12-31'),
            autoRenew: true,
        });
        // 5. Create services
        const serviceCategoryId = vendorCategories[0];
        const serviceIds = [];
        for (const sd of vd.services) {
            const serviceImgs = PORTFOLIO_POOLS[vd.portfolioKey].slice(0, 3);
            const service = await Service_1.default.create({
                vendor: vendor._id,
                name: sd.name,
                slug: sd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + vendor._id.toString().slice(-4),
                description: sd.description,
                category: serviceCategoryId,
                basePrice: sd.price,
                priceType: 'fixed',
                currency: 'NGN',
                duration: sd.duration,
                images: serviceImgs,
                isActive: true,
                isDeleted: false,
                approvalStatus: 'approved',
                approvedAt: new Date('2024-01-20'),
                tags: [vd.portfolioKey, 'beauty', 'lagos'],
                metadata: {
                    views: sd.views,
                    bookings: sd.bookings,
                    completedBookings: Math.floor(sd.bookings * 0.9),
                    averageRating: vd.rating,
                    totalReviews: Math.floor(sd.bookings * 0.6),
                },
            });
            serviceIds.push(service._id);
        }
        // 6. Create completed bookings + reviews
        const bookingDates = [
            new Date('2026-03-10'), new Date('2026-04-05'), new Date('2026-05-20'),
            new Date('2026-06-12'), new Date('2026-07-01'),
        ];
        for (let bi = 0; bi < Math.min(bookingDates.length, vd.services.length); bi++) {
            const svc = vd.services[bi];
            const svcId = serviceIds[bi];
            const bDate = bookingDates[bi];
            const review = REVIEWS[(vi * 3 + bi) % REVIEWS.length];
            const booking = await Booking_1.default.create({
                bookingType: types_1.BookingType.STANDARD,
                client: testClient._id,
                vendor: vendor._id,
                service: svcId,
                scheduledDate: bDate,
                scheduledTime: '10:00',
                duration: svc.duration,
                servicePrice: svc.price,
                distanceCharge: 0,
                totalAmount: svc.price,
                status: types_1.BookingStatus.COMPLETED,
                statusHistory: [
                    { status: types_1.BookingStatus.PENDING, changedAt: new Date(bDate.getTime() - 7 * 86400000), changedBy: testClient._id },
                    { status: types_1.BookingStatus.ACCEPTED, changedAt: new Date(bDate.getTime() - 6 * 86400000), changedBy: vendor._id },
                    { status: types_1.BookingStatus.IN_PROGRESS, changedAt: bDate, changedBy: vendor._id },
                    { status: types_1.BookingStatus.COMPLETED, changedAt: new Date(bDate.getTime() + 2 * 3600000), changedBy: testClient._id },
                ],
                clientNotes: 'Looking forward to this!',
                vendorStartConfirmed: true,
                clientStartConfirmed: true,
                sessionStartedAt: bDate,
                completedAt: new Date(bDate.getTime() + 2 * 3600000),
                completedBy: 'both',
                clientMarkedComplete: true,
                vendorMarkedComplete: true,
                paymentStatus: 'released',
                hasDispute: false,
                hasReview: true,
                isDeleted: false,
                location: vd.vendorType !== types_1.VendorType.IN_SHOP ? {
                    type: 'Point',
                    coordinates: [3.38, 6.53],
                    address: '15 Bode Thomas Street',
                    city: 'Surulere',
                    state: 'Lagos',
                } : undefined,
            });
            // Create review
            await Review_1.default.create({
                reviewer: testClient._id,
                reviewee: vendor._id,
                reviewerType: 'client',
                booking: booking._id,
                service: svcId,
                rating: review.rating,
                comment: review.comment,
                detailedRatings: {
                    quality: review.rating,
                    communication: review.rating,
                    punctuality: Math.min(5, review.rating),
                    value: review.rating,
                },
                isDeleted: false,
            });
        }
        console.log(`     └── Created ${vd.services.length} services + ${Math.min(bookingDates.length, vd.services.length)} bookings + reviews`);
    }
    console.log('\n🎉 Vendor seed complete!');
    console.log('   Test client: testclient@sharplook.com / TestClient@2024');
    console.log('   Vendor password (all): Vendor@2024');
};
exports.seedVendors = seedVendors;
//# sourceMappingURL=vendors.seed.js.map