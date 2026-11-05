"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Offer_1 = __importDefault(require("../models/Offer"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Service_1 = __importDefault(require("../models/Service"));
const User_1 = __importDefault(require("../models/User"));
const Category_1 = __importDefault(require("../models/Category"));
const Payment_1 = __importDefault(require("../models/Payment")); // ✅ NEW
const errors_1 = require("../utils/errors");
const types_1 = require("../types"); // ✅ UPDATED
const helpers_1 = require("../utils/helpers"); // ✅ UPDATED
const logger_1 = __importDefault(require("../utils/logger"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
const transaction_service_1 = __importDefault(require("./transaction.service")); // ✅ NEW
const paystackHelper_1 = __importDefault(require("../utils/paystackHelper")); // ✅ NEW
const promo_service_1 = __importDefault(require("./promo.service"));
class OfferService {
    /**
     * Create offer request
     * ✅ UPDATED: Added serviceType field
     */
    async createOffer(clientId, data) {
        // ✅ NEW: Validate serviceType
        if (!data.serviceType || !['home', 'shop', 'both'].includes(data.serviceType)) {
            throw new errors_1.BadRequestError('Service type is required. Must be: home, shop, or both');
        }
        // ✅ NEW: Validate location is provided for home service
        if ((data.serviceType === 'home' || data.serviceType === 'both') && !data.location) {
            throw new errors_1.BadRequestError('Location is required for home service requests');
        }
        // Verify category exists
        const category = await Category_1.default.findById(data.category);
        if (!category) {
            throw new errors_1.NotFoundError('Category not found');
        }
        // Verify service if provided
        if (data.service) {
            const service = await Service_1.default.findById(data.service);
            if (!service) {
                throw new errors_1.NotFoundError('Service not found');
            }
        }
        // Calculate expiration
        const expiresInDays = data.expiresInDays || 7;
        const expiresAt = (0, helpers_1.addDays)(new Date(), expiresInDays);
        // ✅ UPDATED: Build location object (optional) - with proper validation
        let location = undefined;
        if (data.location && data.location.coordinates && data.location.coordinates.length === 2) {
            location = {
                type: 'Point',
                coordinates: data.location.coordinates,
                address: data.location.address || '',
                city: data.location.city || '',
                state: data.location.state || '',
            };
        }
        // ✅ Build offer data conditionally
        const partySize = Math.min(10, Math.max(1, Math.floor(data.partySize ?? 1)));
        const offerData = {
            client: clientId,
            category: data.category,
            service: data.service,
            title: data.title,
            description: data.description,
            serviceType: data.serviceType, // ✅ NEW
            proposedPrice: data.proposedPrice,
            partySize,
            preferredDate: data.preferredDate,
            preferredTime: data.preferredTime,
            flexibility: data.flexibility || 'flexible',
            images: data.images,
            expiresAt,
            status: 'open',
            responses: [],
        };
        // Only add location if it exists
        if (location) {
            offerData.location = location;
        }
        // Create offer
        const offer = await Offer_1.default.create(offerData);
        // ✅ UPDATED: Find vendors matching service type
        try {
            const vendorQuery = {
                isVendor: true,
                'vendorProfile.isVerified': true,
            };
            // Match vendors based on service type
            if (data.serviceType === 'home') {
                // Only home service vendors
                vendorQuery['vendorProfile.vendorType'] = {
                    $in: [types_1.VendorType.HOME_SERVICE, types_1.VendorType.BOTH]
                };
            }
            else if (data.serviceType === 'shop') {
                // Only in-shop vendors
                vendorQuery['vendorProfile.vendorType'] = {
                    $in: [types_1.VendorType.IN_SHOP, types_1.VendorType.BOTH]
                };
            }
            else if (data.serviceType === 'both') {
                // All vendors
                vendorQuery['vendorProfile.vendorType'] = {
                    $in: [types_1.VendorType.HOME_SERVICE, types_1.VendorType.IN_SHOP, types_1.VendorType.BOTH]
                };
            }
            // ✅ FIXED: Add location filtering ONLY if location exists and service type requires it
            if (location && location.coordinates && (data.serviceType === 'home' || data.serviceType === 'both')) {
                vendorQuery['vendorProfile.location'] = {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: location.coordinates
                        },
                        $maxDistance: 20000 // 20km
                    }
                };
            }
            const nearbyVendors = await User_1.default.find(vendorQuery).select('_id');
            const vendorIds = nearbyVendors.map(v => v._id.toString());
            if (vendorIds.length > 0) {
                // Populate client info for notification
                await offer.populate('client', 'firstName lastName');
                // Notify matching vendors about new offer
                await notificationHelper_1.default.notifyVendorsAboutNewOffer(offer, vendorIds);
                logger_1.default.info(`✅ Notified ${vendorIds.length} vendors about new ${data.serviceType} service offer`);
            }
            else {
                logger_1.default.warn(`⚠️ No matching vendors found for ${data.serviceType} service offer`);
            }
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify vendors about new offer:', notifyError);
            // Don't fail the offer creation if notification fails
        }
        logger_1.default.info(`Offer created: ${offer._id} by client ${clientId} (serviceType: ${data.serviceType})`);
        return offer;
    }
    /**
     * Get available offers for vendors with distance sorting
     * ✅ UPDATED: Filter by vendor's service type capability
     */
    async getAvailableOffers(vendorId, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // ✅ NEW: Get vendor's service type to filter offers
        const vendor = await User_1.default.findById(vendorId).select('vendorProfile.vendorType');
        if (!vendor || !vendor.vendorProfile?.vendorType) {
            throw new errors_1.BadRequestError('Vendor profile not found');
        }
        const vendorType = vendor.vendorProfile.vendorType;
        // ✅ NEW: Build service type filter
        let serviceTypeFilter;
        if (vendorType === types_1.VendorType.HOME_SERVICE) {
            // Home service vendors can see: home OR both
            serviceTypeFilter = { $in: ['home', 'both'] };
        }
        else if (vendorType === types_1.VendorType.IN_SHOP) {
            // In-shop vendors can see: shop OR both
            serviceTypeFilter = { $in: ['shop', 'both'] };
        }
        else if (vendorType === types_1.VendorType.BOTH) {
            // Vendors offering both can see all offers
            serviceTypeFilter = { $in: ['home', 'shop', 'both'] };
        }
        // If location filter is provided, use aggregation with $geoNear
        if (filters?.location) {
            const maxDistance = (filters.location.maxDistance || 20) * 1000; // Convert km to meters
            const pipeline = [
                // $geoNear MUST be the first stage in aggregation
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [filters.location.longitude, filters.location.latitude],
                        },
                        distanceField: 'distance',
                        maxDistance: maxDistance,
                        spherical: true,
                        query: {
                            status: 'open',
                            expiresAt: { $gt: new Date() },
                            'responses.vendor': { $ne: vendorId },
                            serviceType: serviceTypeFilter, // ✅ NEW: Filter by service type
                        },
                    },
                },
            ];
            // Add category filter
            if (filters.category) {
                pipeline.push({
                    $match: { category: filters.category },
                });
            }
            // Add price filter
            if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
                const priceMatch = {};
                if (filters.priceMin !== undefined) {
                    priceMatch.proposedPrice = { $gte: filters.priceMin };
                }
                if (filters.priceMax !== undefined) {
                    priceMatch.proposedPrice = {
                        ...priceMatch.proposedPrice,
                        $lte: filters.priceMax,
                    };
                }
                pipeline.push({ $match: priceMatch });
            }
            // Add pagination
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });
            // Populate references
            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'client',
                    foreignField: '_id',
                    as: 'client',
                },
            }, { $unwind: '$client' }, {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                },
            }, { $unwind: '$category' });
            const [offers, totalResult] = await Promise.all([
                Offer_1.default.aggregate(pipeline),
                Offer_1.default.aggregate([
                    pipeline[0], // geoNear stage
                    ...(filters.category ? [{ $match: { category: filters.category } }] : []),
                    ...(filters.priceMin || filters.priceMax
                        ? [
                            {
                                $match: {
                                    proposedPrice: {
                                        ...(filters.priceMin ? { $gte: filters.priceMin } : {}),
                                        ...(filters.priceMax ? { $lte: filters.priceMax } : {}),
                                    },
                                },
                            },
                        ]
                        : []),
                    { $count: 'total' },
                ]),
            ]);
            const total = totalResult[0]?.total || 0;
            return {
                offers,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        }
        // If no location filter, use regular query
        const query = {
            status: 'open',
            expiresAt: { $gt: new Date() },
            'responses.vendor': { $ne: vendorId },
            serviceType: serviceTypeFilter, // ✅ NEW: Filter by service type
        };
        if (filters?.category) {
            query.category = filters.category;
        }
        if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
            query.proposedPrice = {};
            if (filters.priceMin !== undefined) {
                query.proposedPrice.$gte = filters.priceMin;
            }
            if (filters.priceMax !== undefined) {
                query.proposedPrice.$lte = filters.priceMax;
            }
        }
        const [offers, total] = await Promise.all([
            Offer_1.default.find(query)
                .populate('client', 'firstName lastName avatar')
                .populate('category', 'name icon')
                .populate('service', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Offer_1.default.countDocuments(query),
        ]);
        return {
            offers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    // ... rest of the methods remain the same (respondToOffer, counterOffer, etc.)
    /**
     * Vendor responds to offer
     */
    async respondToOffer(offerId, vendorId, data) {
        const offer = await Offer_1.default.findById(offerId).populate('client', 'firstName lastName');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Check if offer is still open
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Offer is no longer open');
        }
        // Check expiration
        if (new Date() > offer.expiresAt) {
            offer.status = 'expired';
            await offer.save();
            throw new errors_1.BadRequestError('Offer has expired');
        }
        // Check if vendor already responded
        const existingResponse = offer.responses.find((r) => r.vendor.toString() === vendorId);
        if (existingResponse) {
            throw new errors_1.BadRequestError('You have already responded to this offer');
        }
        // Verify vendor
        const vendor = await User_1.default.findById(vendorId);
        if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
            throw new errors_1.BadRequestError('Only verified vendors can respond to offers');
        }
        // ✅ NEW: Verify vendor can provide the requested service type
        const vendorType = vendor.vendorProfile.vendorType;
        const offerServiceType = offer.serviceType;
        if (offerServiceType === 'home' && vendorType === types_1.VendorType.IN_SHOP) {
            throw new errors_1.BadRequestError('You cannot respond to home service offers as an in-shop vendor');
        }
        if (offerServiceType === 'shop' && vendorType === types_1.VendorType.HOME_SERVICE) {
            throw new errors_1.BadRequestError('You cannot respond to in-shop offers as a home service vendor');
        }
        // Add response
        const response = {
            vendor: vendorId,
            proposedPrice: data.proposedPrice,
            message: data.message,
            estimatedDuration: data.estimatedDuration,
            respondedAt: new Date(),
            isAccepted: false,
        };
        offer.responses.push(response);
        await offer.save();
        // ✅ Notify client about vendor response
        try {
            await notificationHelper_1.default.notifyOfferResponse(offer, vendorId, response);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify client about offer response:', notifyError);
        }
        logger_1.default.info(`Vendor ${vendorId} responded to offer ${offerId}`);
        return offer;
    }
    /**
     * Client submits counter offer to vendor response
     */
    async counterOffer(offerId, clientId, responseId, counterPrice) {
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify ownership
        if (offer.client.toString() !== clientId) {
            throw new errors_1.ForbiddenError('Only the offer creator can submit counter offers');
        }
        // Check status
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Offer is no longer open');
        }
        // Find response
        const response = offer.responses.find((r) => r._id?.toString() === responseId);
        if (!response) {
            throw new errors_1.NotFoundError('Response not found');
        }
        // Add counter offer
        response.counterOffer = counterPrice;
        await offer.save();
        // ✅ Notify vendor about client's counter offer
        try {
            const vendorId = response.vendor.toString();
            await notificationHelper_1.default.notifyCounterOffer(offer, vendorId, counterPrice);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify vendor about counter offer:', notifyError);
        }
        logger_1.default.info(`Counter offer submitted for offer ${offerId}`);
        return offer;
    }
    /**
     * Client accepts vendor response.
     * Wallet path: creates the booking immediately (payment already settled).
     * Card path: initializes Paystack, stashes booking data in Payment.metadata.pendingOfferData.
     *   The actual booking + offer state change happens on webhook confirmation
     *   (finalizeOfferPayment), so the offer stays 'open' if the client abandons.
     */
    async acceptResponse(offerId, clientId, responseId, paymentMethod, 
    // When true, the frontend has shown a promo discount to the user and
    // expects it applied. If we can't grant the slot, throw instead of
    // silently charging full price.
    expectPromo = false) {
        const offer = await Offer_1.default.findById(offerId).populate('service').populate('client', 'firstName lastName email');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        if (offer.client._id.toString() !== clientId) {
            throw new errors_1.ForbiddenError('Only the offer creator can accept responses');
        }
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Offer is no longer open');
        }
        const response = offer.responses.find((r) => r._id?.toString() === responseId);
        if (!response) {
            throw new errors_1.NotFoundError('Response not found');
        }
        const client = await User_1.default.findById(clientId);
        if (!client || !client.email) {
            throw new errors_1.NotFoundError('User not found or email not available');
        }
        const finalPrice = response.counterOffer || response.proposedPrice;
        const vendorId = response.vendor.toString();
        const commissionRate = 0;
        const platformFee = 0;
        const reference = `OFFER-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        const selectedPaymentMethod = paymentMethod || 'card';
        // ==================== PROMO SLOT CLAIM ====================
        // Pre-generate booking ID so we can atomically claim a promo slot referencing it.
        // Offers don't support coupons, so no coupon-conflict check needed here.
        const bookingId = new mongoose_1.default.Types.ObjectId();
        const promoBookingType = offer.serviceType === 'shop' ? 'IN_SHOP' : 'HOME_SERVICE';
        let promoApplied = false;
        let promoDiscount = 0;
        let promoBonusAmount = 0;
        let promoCampaignId;
        let promoRedemptionId;
        let promoCampaignName;
        // Release any prior stale claims this client has on the active promo from
        // an abandoned Paystack session — otherwise the retry hits USER_ALREADY_REDEEMED.
        // See booking.service.ts for the standard-booking twin of this logic.
        try {
            const active = await promo_service_1.default.getActivePromo();
            if (active) {
                const stalePending = await Payment_1.default.find({
                    user: clientId,
                    status: types_1.PaymentStatus.PENDING,
                    paymentMethod: 'card',
                    'metadata.pendingOfferData.promoApplied': true,
                    'metadata.pendingOfferData.promoCampaignId': active._id.toString(),
                });
                for (const p of stalePending) {
                    const od = p.metadata?.pendingOfferData;
                    if (od?.promoCampaignId && od?.promoRedemptionId) {
                        await promo_service_1.default.releaseSlot(od.promoCampaignId, od.promoRedemptionId);
                        od.promoApplied = false;
                        od.promoCampaignId = null;
                        od.promoRedemptionId = null;
                        p.markModified('metadata');
                        await p.save();
                    }
                }
            }
        }
        catch (releaseErr) {
            logger_1.default.warn(`Failed to eager-release stale offer promo slots for client ${clientId}: ${releaseErr.message}`);
        }
        const claim = await promo_service_1.default.claimSlot(clientId, bookingId.toString(), finalPrice, promoBookingType);
        if (claim.success && claim.campaign) {
            promoApplied = true;
            promoDiscount = claim.discountAmount || 0;
            promoBonusAmount = claim.vendorBonusAmount || 0;
            promoCampaignId = claim.campaign._id;
            promoRedemptionId = claim.redemptionId;
            promoCampaignName = claim.campaign.name;
        }
        else if (expectPromo) {
            const reason = claim.reason || 'SLOTS_EXHAUSTED';
            throw new errors_1.AppError(reason === 'USER_ALREADY_REDEEMED'
                ? 'You have already used this promo. You can proceed at full price.'
                : 'Sorry, the promo just sold out. You can proceed at full price.', 409, 'PROMO_SLOT_UNAVAILABLE');
        }
        const clientPaysAmount = Math.max(0, Math.round((finalPrice - promoDiscount) * 100) / 100);
        // ==================== WALLET PAYMENT ====================
        if (selectedPaymentMethod === 'wallet') {
            if ((client.walletBalance || 0) < clientPaysAmount) {
                if (promoApplied && promoCampaignId && promoRedemptionId) {
                    await promo_service_1.default.releaseSlot(promoCampaignId, promoRedemptionId);
                }
                throw new errors_1.BadRequestError(`Insufficient wallet balance. Your balance: ₦${(client.walletBalance || 0).toLocaleString()}, Required: ₦${clientPaysAmount.toLocaleString()}`);
            }
            // Mark offer accepted (in memory) — persisted below alongside booking creation
            response.isAccepted = true;
            offer.selectedVendor = response.vendor;
            offer.selectedResponse = responseId;
            offer.status = 'accepted';
            offer.acceptedAt = new Date();
            const previousBalance = client.walletBalance || 0;
            client.walletBalance = previousBalance - clientPaysAmount;
            await client.save();
            let booking;
            let payment;
            try {
                // servicePrice stays = finalPrice so the vendorAmount virtual reflects
                // the pre-discount base. totalAmount = what the client actually paid.
                const bookingData = {
                    _id: bookingId,
                    bookingType: types_1.BookingType.OFFER_BASED,
                    client: clientId,
                    vendor: response.vendor,
                    offer: offer._id,
                    scheduledDate: offer.preferredDate || new Date(),
                    scheduledTime: offer.preferredTime,
                    duration: (response.estimatedDuration || 60) * (offer.partySize || 1),
                    location: offer.location,
                    servicePrice: finalPrice,
                    distanceCharge: 0,
                    partySize: offer.partySize || 1,
                    totalAmount: clientPaysAmount,
                    promoApplied,
                    promoCampaign: promoCampaignId,
                    promoRedemptionId,
                    promoDiscount,
                    promoBonusAmount,
                    status: types_1.BookingStatus.PENDING,
                    paymentStatus: 'escrowed',
                    paymentReference: reference,
                    clientMarkedComplete: false,
                    vendorMarkedComplete: false,
                    hasDispute: false,
                    hasReview: false,
                    statusHistory: [
                        {
                            status: types_1.BookingStatus.PENDING,
                            changedAt: new Date(),
                            changedBy: clientId,
                        },
                    ],
                };
                if (offer.service) {
                    bookingData.service = offer.service;
                }
                booking = await Booking_1.default.create(bookingData);
                // amount = what client actually paid (post-promo).
                // vendorAmount = full pre-discount base — vendor paid as if no discount.
                payment = await Payment_1.default.create({
                    user: clientId,
                    booking: booking._id,
                    amount: clientPaysAmount,
                    currency: 'NGN',
                    status: types_1.PaymentStatus.COMPLETED,
                    paymentMethod: 'wallet',
                    reference,
                    paidAt: new Date(),
                    initiatedAt: new Date(),
                    escrowStatus: 'held',
                    escrowedAt: new Date(),
                    commissionRate,
                    platformFee,
                    vendorAmount: finalPrice,
                });
                booking.paymentId = payment._id;
                offer.bookingId = booking._id;
                await offer.save();
                await booking.save();
            }
            catch (error) {
                // Rollback wallet + release promo slot. If booking/payment/offer partially
                // persisted, they're left; we prioritize the client not being wrongly charged.
                client.walletBalance = previousBalance;
                await client.save();
                if (promoApplied && promoCampaignId && promoRedemptionId) {
                    await promo_service_1.default.releaseSlot(promoCampaignId, promoRedemptionId);
                }
                throw error;
            }
            // Best-effort side effects — failures here MUST NOT trigger a wallet rollback,
            // since the booking is already valid and money already settled.
            try {
                await transaction_service_1.default.createTransaction({
                    userId: clientId,
                    type: types_1.TransactionType.BOOKING_PAYMENT,
                    amount: clientPaysAmount,
                    description: `Payment for offer-based booking #${booking._id.toString().slice(-8)}`,
                    booking: booking._id.toString(),
                    payment: payment._id.toString(),
                });
            }
            catch (err) {
                logger_1.default.error(`Failed to create transaction for offer wallet payment ${reference}:`, err);
            }
            try {
                await notificationHelper_1.default.notifyOfferAccepted(offer, vendorId, booking);
            }
            catch (err) {
                logger_1.default.error(`Failed to notify vendor of accepted offer ${offerId}:`, err);
            }
            try {
                await notificationHelper_1.default.notifyPaymentSuccessful(payment, clientId);
            }
            catch (err) {
                logger_1.default.error(`Failed to notify client of successful offer payment ${reference}:`, err);
            }
            if (promoApplied && promoDiscount > 0) {
                try {
                    await notificationHelper_1.default.notifyPromoApplied(clientId, promoDiscount, booking._id.toString(), promoCampaignName);
                }
                catch (err) {
                    logger_1.default.error(`Failed to notify client of applied promo ${reference}:`, err);
                }
            }
            logger_1.default.info(`✅ Offer accepted with wallet payment: ${offerId}, booking created: ${booking._id}${promoApplied ? ` (promo applied, -₦${promoDiscount})` : ''}`);
            return { offer, booking };
        }
        // ==================== PAYSTACK PAYMENT ====================
        if (selectedPaymentMethod === 'card') {
            // Init Paystack FIRST. Offer stays 'open', no booking created. If the client
            // completes payment, the webhook (finalizeOfferPayment) creates the booking
            // and marks the offer accepted. If they abandon, the abandoned-promo-slot
            // cron reclaims the slot and the offer is still available.
            let paymentData;
            try {
                paymentData = await paystackHelper_1.default.initializePayment(client.email, clientPaysAmount, reference, {
                    // bookingId is what the webhook uses to route this to
                    // bookingService.verifyPaystackPayment — do not remove.
                    bookingId: bookingId.toString(),
                    clientId,
                    vendorId,
                    offerId,
                    responseId,
                    commissionRate,
                    platformFee,
                    vendorAmount: finalPrice,
                    paymentType: 'offer_booking',
                });
            }
            catch (err) {
                if (promoApplied && promoCampaignId && promoRedemptionId) {
                    await promo_service_1.default.releaseSlot(promoCampaignId, promoRedemptionId);
                }
                throw err;
            }
            // Stash everything the webhook needs to build the booking + accept the offer.
            // Uses pendingOfferData (distinct from pendingBookingData) so the webhook
            // can dispatch to the offer-specific finalizer.
            try {
                await Payment_1.default.create({
                    user: clientId,
                    amount: clientPaysAmount,
                    currency: 'NGN',
                    status: types_1.PaymentStatus.PENDING,
                    paymentMethod: 'card',
                    paymentType: 'offer_booking',
                    reference,
                    initiatedAt: new Date(),
                    escrowStatus: 'pending',
                    commissionRate,
                    platformFee,
                    vendorAmount: finalPrice,
                    metadata: {
                        paymentType: 'offer_booking',
                        pendingOfferData: {
                            bookingId: bookingId.toString(),
                            offerId,
                            responseId,
                            clientId,
                            vendorId,
                            serviceId: offer.service ? offer.service._id?.toString() || offer.service.toString() : null,
                            scheduledDate: offer.preferredDate || new Date(),
                            scheduledTime: offer.preferredTime || null,
                            duration: (response.estimatedDuration || 60) * (offer.partySize || 1),
                            location: offer.location || null,
                            servicePrice: finalPrice,
                            partySize: offer.partySize || 1,
                            totalAmount: clientPaysAmount,
                            promoApplied,
                            promoCampaignId: promoCampaignId?.toString() || null,
                            promoRedemptionId: promoRedemptionId?.toString() || null,
                            promoDiscount,
                            promoBonusAmount,
                            promoCampaignName: promoCampaignName || null,
                        },
                    },
                });
            }
            catch (err) {
                if (promoApplied && promoCampaignId && promoRedemptionId) {
                    await promo_service_1.default.releaseSlot(promoCampaignId, promoRedemptionId);
                }
                throw err;
            }
            logger_1.default.info(`💳 Paystack payment initialized for pending offer booking: ${reference}`);
            // Synthetic booking-like object for the frontend to hand to the Payment screen.
            // The real booking is created by the webhook after charge.success.
            return {
                offer: null,
                booking: {
                    _id: bookingId,
                    totalAmount: clientPaysAmount,
                    paymentReference: reference,
                    authorizationUrl: paymentData.authorization_url,
                },
            };
        }
        throw new errors_1.BadRequestError('Invalid payment method. Use "wallet" or "card"');
    }
    /**
     * Called by webhook after Paystack confirms an offer_booking payment.
     * Creates the booking, marks the offer accepted, links Payment, notifies vendor.
     * Idempotent: safe to call multiple times for the same reference.
     */
    async finalizeOfferPayment(existingPayment, paymentData) {
        const pd = existingPayment.metadata?.pendingOfferData;
        if (!pd) {
            throw new errors_1.BadRequestError('Payment has no pendingOfferData');
        }
        // Idempotency: already processed
        if (existingPayment.status === types_1.PaymentStatus.COMPLETED && existingPayment.booking) {
            const existingBooking = await Booking_1.default.findById(existingPayment.booking);
            const existingOffer = await Offer_1.default.findById(pd.offerId);
            if (existingBooking && existingOffer) {
                logger_1.default.info(`Offer payment ${existingPayment.reference} already processed for booking ${existingBooking._id}`);
                return { booking: existingBooking, payment: existingPayment, offer: existingOffer };
            }
        }
        const offer = await Offer_1.default.findById(pd.offerId).populate('client', 'firstName lastName email');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found during finalize');
        }
        // If someone else already accepted (or offer was closed), refund is out of scope
        // here — but the promo slot must be released so it doesn't leak. The client
        // will need manual refund of the Paystack charge; log loudly.
        if (offer.status !== 'open') {
            if (pd.promoApplied && pd.promoCampaignId && pd.promoRedemptionId) {
                await promo_service_1.default.releaseSlot(pd.promoCampaignId, pd.promoRedemptionId);
            }
            logger_1.default.error(`⚠️ Offer ${pd.offerId} no longer open when finalizing payment ${existingPayment.reference}. Manual refund needed.`);
            throw new errors_1.BadRequestError('Offer is no longer open. Manual refund required.');
        }
        const response = offer.responses.find((r) => r._id?.toString() === pd.responseId);
        if (!response) {
            throw new errors_1.NotFoundError('Response not found during finalize');
        }
        // Reuse pre-generated bookingId so it matches the promo redemption record.
        const bookingData = {
            _id: new mongoose_1.default.Types.ObjectId(pd.bookingId),
            bookingType: types_1.BookingType.OFFER_BASED,
            client: pd.clientId,
            vendor: pd.vendorId,
            offer: offer._id,
            scheduledDate: pd.scheduledDate,
            scheduledTime: pd.scheduledTime,
            duration: pd.duration,
            location: pd.location,
            servicePrice: pd.servicePrice,
            distanceCharge: 0,
            partySize: pd.partySize || 1,
            totalAmount: pd.totalAmount,
            promoApplied: !!pd.promoApplied,
            promoCampaign: pd.promoCampaignId ? new mongoose_1.default.Types.ObjectId(pd.promoCampaignId) : undefined,
            promoRedemptionId: pd.promoRedemptionId ? new mongoose_1.default.Types.ObjectId(pd.promoRedemptionId) : undefined,
            promoDiscount: pd.promoDiscount || 0,
            promoBonusAmount: pd.promoBonusAmount || 0,
            status: types_1.BookingStatus.PENDING,
            paymentStatus: 'escrowed',
            paymentReference: existingPayment.reference,
            clientMarkedComplete: false,
            vendorMarkedComplete: false,
            hasDispute: false,
            hasReview: false,
            statusHistory: [
                {
                    status: types_1.BookingStatus.PENDING,
                    changedAt: new Date(),
                    changedBy: pd.clientId,
                },
            ],
        };
        if (pd.serviceId) {
            bookingData.service = pd.serviceId;
        }
        const booking = await Booking_1.default.create(bookingData);
        // Update Payment: link booking, mark completed
        existingPayment.status = types_1.PaymentStatus.COMPLETED;
        existingPayment.booking = booking._id;
        existingPayment.paidAt = new Date(paymentData?.paid_at || Date.now());
        existingPayment.escrowStatus = 'held';
        existingPayment.escrowedAt = new Date();
        // vendorAmount already set at Payment.create (= finalPrice pre-discount)
        await existingPayment.save();
        booking.paymentId = existingPayment._id;
        await booking.save();
        // Accept the offer now that we know payment succeeded
        response.isAccepted = true;
        offer.selectedVendor = response.vendor;
        offer.selectedResponse = pd.responseId;
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        offer.bookingId = booking._id;
        await offer.save();
        // Best-effort side effects
        try {
            await transaction_service_1.default.createTransaction({
                userId: pd.clientId,
                type: types_1.TransactionType.BOOKING_PAYMENT,
                amount: pd.totalAmount,
                description: `Payment for offer-based booking #${booking._id.toString().slice(-8)}`,
                booking: booking._id.toString(),
                payment: existingPayment._id.toString(),
            });
        }
        catch (err) {
            logger_1.default.error(`Failed to create transaction for offer card payment ${existingPayment.reference}:`, err);
        }
        try {
            await notificationHelper_1.default.notifyOfferAccepted(offer, pd.vendorId, booking);
        }
        catch (err) {
            logger_1.default.error(`Failed to notify vendor of accepted offer ${pd.offerId}:`, err);
        }
        try {
            await notificationHelper_1.default.notifyPaymentSuccessful(existingPayment, pd.clientId);
        }
        catch (err) {
            logger_1.default.error(`Failed to notify client of successful offer payment ${existingPayment.reference}:`, err);
        }
        if (pd.promoApplied && pd.promoDiscount > 0) {
            try {
                await notificationHelper_1.default.notifyPromoApplied(pd.clientId, pd.promoDiscount, booking._id.toString(), pd.promoCampaignName || undefined);
            }
            catch (err) {
                logger_1.default.error(`Failed to notify client of applied promo ${existingPayment.reference}:`, err);
            }
        }
        logger_1.default.info(`✅ Offer booking finalized after card payment ${existingPayment.reference}: booking ${booking._id}${pd.promoApplied ? ` (promo -₦${pd.promoDiscount})` : ''}`);
        return { booking, payment: existingPayment, offer };
    }
    /**
     * Get offer by ID
     */
    async getOfferById(offerId, userId) {
        const offer = await Offer_1.default.findById(offerId)
            .populate('client', 'firstName lastName avatar')
            .populate('category', 'name icon')
            .populate('service', 'name images')
            .populate('responses.vendor', 'firstName lastName vendorProfile');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify access
        const isClient = offer.client._id.toString() === userId;
        const hasResponded = offer.responses.some((r) => r.vendor._id.toString() === userId);
        if (!isClient && !hasResponded) {
            throw new errors_1.ForbiddenError('Not authorized to view this offer');
        }
        return offer;
    }
    /**
     * Get client offers
     */
    async getClientOffers(clientId, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [offers, total] = await Promise.all([
            Offer_1.default.find({ client: clientId })
                .populate('category', 'name icon')
                .populate('service', 'name')
                .populate('responses.vendor', 'firstName lastName vendorProfile')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Offer_1.default.countDocuments({ client: clientId }),
        ]);
        return {
            offers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get vendor offer responses
     */
    async getVendorResponses(vendorId, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const [offers, total] = await Promise.all([
            Offer_1.default.find({ 'responses.vendor': vendorId })
                .populate('client', 'firstName lastName avatar')
                .populate('category', 'name icon')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Offer_1.default.countDocuments({ 'responses.vendor': vendorId }),
        ]);
        return {
            offers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Close offer (client)
     */
    async closeOffer(offerId, clientId) {
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify ownership
        if (offer.client.toString() !== clientId) {
            throw new errors_1.ForbiddenError('Only the offer creator can close offers');
        }
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('Only open offers can be closed');
        }
        offer.status = 'closed';
        await offer.save();
        logger_1.default.info(`Offer closed: ${offerId}`);
        return offer;
    }
    /**
     * Vendor accepts client's counter offer
     */
    async acceptCounterOffer(offerId, responseId, vendorId) {
        const offer = await Offer_1.default.findById(offerId).populate('service').populate('client', 'firstName lastName');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('This offer is no longer open');
        }
        const response = offer.responses.find((r) => r._id?.toString() === responseId && r.vendor.toString() === vendorId);
        if (!response) {
            throw new errors_1.NotFoundError('Response not found');
        }
        if (!response.counterOffer) {
            throw new errors_1.BadRequestError('No counter offer to accept');
        }
        if (response.isAccepted) {
            throw new errors_1.BadRequestError('This response has already been accepted');
        }
        // Mark response as accepted
        response.isAccepted = true;
        response.acceptedAt = new Date();
        offer.selectedVendor = response.vendor;
        offer.selectedResponse = responseId;
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        // Create booking with the counter offer price
        const booking = await Booking_1.default.create({
            bookingType: types_1.BookingType.OFFER_BASED,
            client: offer.client._id,
            vendor: vendorId,
            service: offer.service,
            offer: offer._id,
            scheduledDate: offer.preferredDate || new Date(),
            scheduledTime: offer.preferredTime,
            duration: (response.estimatedDuration ?? 0) * (offer.partySize || 1),
            location: offer.location,
            servicePrice: response.counterOffer,
            distanceCharge: 0,
            partySize: offer.partySize || 1,
            totalAmount: response.counterOffer,
            status: types_1.BookingStatus.PENDING,
            paymentStatus: 'pending',
            clientMarkedComplete: false,
            vendorMarkedComplete: false,
            hasDispute: false,
            hasReview: false,
            statusHistory: [
                {
                    status: types_1.BookingStatus.PENDING,
                    changedAt: new Date(),
                    changedBy: vendorId,
                },
            ],
        });
        offer.bookingId = booking._id;
        await offer.save();
        // ✅ Notify client that vendor accepted their counter offer
        try {
            await notificationHelper_1.default.notifyOfferAccepted(offer, vendorId, booking);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify client about accepted counter offer:', notifyError);
        }
        logger_1.default.info(`Vendor ${vendorId} accepted counter offer for ${offerId}, booking created: ${booking._id}`);
        return { offer, booking };
    }
    /**
     * Vendor makes counter offer to client's counter
     */
    async vendorCounterOffer(offerId, responseId, vendorId, newPrice) {
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        if (offer.status !== 'open') {
            throw new errors_1.BadRequestError('This offer is no longer open');
        }
        const response = offer.responses.find((r) => r._id?.toString() === responseId && r.vendor.toString() === vendorId);
        if (!response) {
            throw new errors_1.NotFoundError('Response not found');
        }
        // Update the vendor's proposed price (counter back to client)
        response.proposedPrice = newPrice;
        response.counterOffer = undefined; // Clear client's counter since vendor is countering back
        response.respondedAt = new Date();
        await offer.save();
        await offer.populate([
            { path: 'client', select: 'firstName lastName email phone' },
            { path: 'category', select: 'name icon' },
            { path: 'service', select: 'name description' },
            {
                path: 'responses.vendor',
                select: 'firstName lastName email phone vendorProfile',
            },
        ]);
        // ✅ Notify client about vendor's counter offer
        try {
            await notificationHelper_1.default.notifyCounterOffer(offer, vendorId, newPrice);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify client about vendor counter offer:', notifyError);
        }
        logger_1.default.info(`Vendor ${vendorId} countered with ₦${newPrice} for offer ${offerId}`);
        return offer;
    }
    /**
   * Get all offers (admin)
   */
    async getAllOffers(filters, page = 1, limit = 20) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        const query = {};
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.category) {
            query.category = filters.category;
        }
        if (filters?.client) {
            query.client = filters.client;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }
        const [offers, total] = await Promise.all([
            Offer_1.default.find(query)
                .populate('client', 'firstName lastName email phone')
                .populate('category', 'name icon')
                .populate('service', 'name')
                .populate('responses.vendor', 'firstName lastName vendorProfile')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Offer_1.default.countDocuments(query),
        ]);
        return {
            offers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Get offer statistics (admin)
     */
    async getOfferStats() {
        const [total, open, accepted, closed, expired, allOffers,] = await Promise.all([
            Offer_1.default.countDocuments(),
            Offer_1.default.countDocuments({ status: 'open' }),
            Offer_1.default.countDocuments({ status: 'accepted' }),
            Offer_1.default.countDocuments({ status: 'closed' }),
            Offer_1.default.countDocuments({ status: 'expired' }),
            Offer_1.default.find({}, 'responses'),
        ]);
        const totalResponses = allOffers.reduce((sum, offer) => sum + offer.responses.length, 0);
        const avgResponsesPerOffer = total > 0 ? totalResponses / total : 0;
        return {
            total,
            open,
            accepted,
            closed,
            expired,
            totalResponses,
            avgResponsesPerOffer: Math.round(avgResponsesPerOffer * 10) / 10,
        };
    }
    /**
     * Delete offer (admin)
     */
    async deleteOffer(offerId) {
        const offer = await Offer_1.default.findById(offerId);
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        if (offer.status === 'accepted' && offer.bookingId) {
            throw new errors_1.BadRequestError('Cannot delete an offer with an active booking');
        }
        await Offer_1.default.findByIdAndDelete(offerId);
        logger_1.default.info(`Offer deleted: ${offerId}`);
    }
}
exports.default = new OfferService();
//# sourceMappingURL=offer.service.js.map