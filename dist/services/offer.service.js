"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const subscription_service_1 = __importDefault(require("./subscription.service")); // ✅ NEW
const paystackHelper_1 = __importDefault(require("../utils/paystackHelper")); // ✅ NEW
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
        const offerData = {
            client: clientId,
            category: data.category,
            service: data.service,
            title: data.title,
            description: data.description,
            serviceType: data.serviceType, // ✅ NEW
            proposedPrice: data.proposedPrice,
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
     * Client accepts vendor response and creates booking
     * ✅ UPDATED: Now supports immediate payment (wallet or Paystack)
     */
    async acceptResponse(offerId, clientId, responseId, paymentMethod // ✅ NEW: Payment method
    ) {
        const offer = await Offer_1.default.findById(offerId).populate('service').populate('client', 'firstName lastName email');
        if (!offer) {
            throw new errors_1.NotFoundError('Offer not found');
        }
        // Verify ownership
        if (offer.client._id.toString() !== clientId) {
            throw new errors_1.ForbiddenError('Only the offer creator can accept responses');
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
        // Mark response as accepted
        response.isAccepted = true;
        offer.selectedVendor = response.vendor;
        offer.selectedResponse = responseId;
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        // Get client for payment
        const client = await User_1.default.findById(clientId);
        if (!client || !client.email) {
            throw new errors_1.NotFoundError('User not found or email not available');
        }
        // Calculate final price
        const finalPrice = response.counterOffer || response.proposedPrice;
        // Get vendor's commission rate
        const vendorId = response.vendor.toString();
        const commissionRate = await subscription_service_1.default.getCommissionRate(vendorId);
        const platformFee = Math.round((finalPrice * commissionRate) / 100);
        const vendorAmount = finalPrice - platformFee;
        // Generate payment reference
        const reference = `OFFER-${Date.now()}-${(0, helpers_1.generateRandomString)(8)}`;
        // Determine payment method (default to 'card' if not specified)
        const selectedPaymentMethod = paymentMethod || 'card';
        // ==================== WALLET PAYMENT ====================
        if (selectedPaymentMethod === 'wallet') {
            // Check wallet balance
            if ((client.walletBalance || 0) < finalPrice) {
                throw new errors_1.BadRequestError(`Insufficient wallet balance. Your balance: ₦${(client.walletBalance || 0).toLocaleString()}, Required: ₦${finalPrice.toLocaleString()}`);
            }
            // Deduct from wallet
            const previousBalance = client.walletBalance || 0;
            client.walletBalance = previousBalance - finalPrice;
            await client.save();
            try {
                // Create booking with payment
                const bookingData = {
                    bookingType: types_1.BookingType.OFFER_BASED,
                    client: clientId,
                    vendor: response.vendor,
                    offer: offer._id,
                    scheduledDate: offer.preferredDate || new Date(),
                    scheduledTime: offer.preferredTime,
                    duration: response.estimatedDuration || 60,
                    location: offer.location,
                    servicePrice: finalPrice,
                    distanceCharge: 0,
                    totalAmount: finalPrice,
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
                const booking = await Booking_1.default.create(bookingData);
                // Create payment record
                const payment = await Payment_1.default.create({
                    user: clientId,
                    booking: booking._id,
                    amount: finalPrice,
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
                    vendorAmount,
                });
                booking.paymentId = payment._id;
                offer.bookingId = booking._id;
                await offer.save();
                await booking.save();
                // Create transaction
                await transaction_service_1.default.createTransaction({
                    userId: clientId,
                    type: types_1.TransactionType.BOOKING_PAYMENT,
                    amount: finalPrice,
                    description: `Payment for offer-based booking #${booking._id.toString().slice(-8)}`,
                    booking: booking._id.toString(),
                    payment: payment._id.toString(),
                });
                // Notify vendor
                await notificationHelper_1.default.notifyOfferAccepted(offer, vendorId, booking);
                await notificationHelper_1.default.notifyPaymentSuccessful(payment, clientId);
                logger_1.default.info(`✅ Offer accepted with wallet payment: ${offerId}, booking created: ${booking._id}`);
                return { offer, booking };
            }
            catch (error) {
                // Rollback wallet deduction
                client.walletBalance = previousBalance;
                await client.save();
                throw error;
            }
        }
        // ==================== PAYSTACK PAYMENT ====================
        if (selectedPaymentMethod === 'card') {
            // Create booking in PENDING state
            const bookingData = {
                bookingType: types_1.BookingType.OFFER_BASED,
                client: clientId,
                vendor: response.vendor,
                offer: offer._id,
                scheduledDate: offer.preferredDate || new Date(),
                scheduledTime: offer.preferredTime,
                duration: response.estimatedDuration || 60,
                location: offer.location,
                servicePrice: finalPrice,
                distanceCharge: 0,
                totalAmount: finalPrice,
                status: types_1.BookingStatus.PENDING,
                paymentStatus: 'pending',
                paymentReference: reference,
                paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
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
            const booking = await Booking_1.default.create(bookingData);
            offer.bookingId = booking._id;
            await offer.save();
            // Initialize Paystack payment
            const paymentData = await paystackHelper_1.default.initializePayment(client.email, finalPrice, reference, {
                bookingId: booking._id.toString(),
                clientId: clientId,
                vendorId: vendorId,
                offerId: offerId,
                serviceId: booking.service,
                commissionRate,
                platformFee,
                vendorAmount,
                paymentType: 'offer_booking',
            });
            logger_1.default.info(`💳 Paystack payment initialized for offer booking: ${reference}`);
            return {
                offer,
                booking: {
                    ...booking.toObject(),
                    authorizationUrl: paymentData.authorization_url, // ✅ Return URL for frontend
                },
            };
        }
        throw new errors_1.BadRequestError('Invalid payment method. Use "wallet" or "card"');
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
            duration: response.estimatedDuration,
            location: offer.location,
            servicePrice: response.counterOffer,
            distanceCharge: 0,
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