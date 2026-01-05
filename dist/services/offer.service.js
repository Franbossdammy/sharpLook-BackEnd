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
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
const notificationHelper_1 = __importDefault(require("../utils/notificationHelper"));
class OfferService {
    /**
     * Create offer request
     */
    async createOffer(clientId, data) {
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
        // Create offer
        const offer = await Offer_1.default.create({
            client: clientId,
            category: data.category,
            service: data.service,
            title: data.title,
            description: data.description,
            proposedPrice: data.proposedPrice,
            location: {
                type: 'Point',
                coordinates: data.location.coordinates,
                address: data.location.address,
                city: data.location.city,
                state: data.location.state,
            },
            preferredDate: data.preferredDate,
            preferredTime: data.preferredTime,
            flexibility: data.flexibility || 'flexible',
            images: data.images,
            expiresAt,
            status: 'open',
            responses: [],
        });
        // ✅ Find nearby vendors and notify them
        try {
            const nearbyVendors = await User_1.default.find({
                isVendor: true,
                'vendorProfile.isVerified': true,
                'vendorProfile.location': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: data.location.coordinates
                        },
                        $maxDistance: 20000 // 20km
                    }
                }
            }).select('_id');
            const vendorIds = nearbyVendors.map(v => v._id.toString());
            if (vendorIds.length > 0) {
                // Populate client info for notification
                await offer.populate('client', 'firstName lastName');
                // Notify nearby vendors about new offer
                await notificationHelper_1.default.notifyVendorsAboutNewOffer(offer, vendorIds);
            }
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify vendors about new offer:', notifyError);
            // Don't fail the offer creation if notification fails
        }
        logger_1.default.info(`Offer created: ${offer._id} by client ${clientId}`);
        return offer;
    }
    /**
     * Get available offers for vendors with distance sorting
     */
    async getAvailableOffers(vendorId, filters, page = 1, limit = 10) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
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
     */
    async acceptResponse(offerId, clientId, responseId) {
        const offer = await Offer_1.default.findById(offerId).populate('service').populate('client', 'firstName lastName');
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
        // Create booking
        const finalPrice = response.counterOffer || response.proposedPrice;
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
        // ✅ Notify vendor that their response was accepted
        try {
            const vendorId = response.vendor.toString();
            await notificationHelper_1.default.notifyOfferAccepted(offer, vendorId, booking);
        }
        catch (notifyError) {
            logger_1.default.error('Failed to notify vendor about accepted offer:', notifyError);
        }
        logger_1.default.info(`Offer accepted: ${offerId}, booking created: ${booking._id}`);
        return { offer, booking };
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