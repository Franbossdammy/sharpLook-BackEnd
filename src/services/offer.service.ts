import Offer, { IOffer } from '../models/Offer';
import Booking from '../models/Booking';
import Service from '../models/Service';
import User from '../models/User';
import Category from '../models/Category';
import Payment from '../models/Payment'; // ✅ NEW
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../utils/errors';
import { BookingType, BookingStatus, VendorType, TransactionType, PaymentStatus } from '../types'; // ✅ UPDATED
import { parsePaginationParams, addDays, generateRandomString } from '../utils/helpers'; // ✅ UPDATED
import logger from '../utils/logger';
import notificationHelper from '../utils/notificationHelper';
import transactionService from './transaction.service'; // ✅ NEW
import subscriptionService from './subscription.service'; // ✅ NEW
import paystackHelper from '../utils/paystackHelper'; // ✅ NEW

class OfferService {
  /**
   * Create offer request
   * ✅ UPDATED: Added serviceType field
   */
  public async createOffer(
    clientId: string,
    data: {
      title: string;
      description: string;
      category: string;
      service?: string;
      serviceType: 'home' | 'shop' | 'both'; // ✅ NEW: Required field
      proposedPrice: number;
      location?: { // ✅ UPDATED: Optional (required only for home service)
        address: string;
        city: string;
        state: string;
        coordinates: [number, number];
      };
      preferredDate?: Date;
      preferredTime?: string;
      flexibility?: 'flexible' | 'specific' | 'urgent';
      images?: string[];
      expiresInDays?: number;
    }
  ): Promise<IOffer> {
    // ✅ NEW: Validate serviceType
    if (!data.serviceType || !['home', 'shop', 'both'].includes(data.serviceType)) {
      throw new BadRequestError('Service type is required. Must be: home, shop, or both');
    }

    // ✅ NEW: Validate location is provided for home service
    if ((data.serviceType === 'home' || data.serviceType === 'both') && !data.location) {
      throw new BadRequestError('Location is required for home service requests');
    }

    // Verify category exists
    const category = await Category.findById(data.category);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Verify service if provided
    if (data.service) {
      const service = await Service.findById(data.service);
      if (!service) {
        throw new NotFoundError('Service not found');
      }
    }

    // Calculate expiration
    const expiresInDays = data.expiresInDays || 7;
    const expiresAt = addDays(new Date(), expiresInDays);

    // ✅ UPDATED: Build location object (optional) - with proper validation
    let location: any = undefined;
    
    if (data.location && data.location.coordinates && data.location.coordinates.length === 2) {
      location = {
        type: 'Point' as const,
        coordinates: data.location.coordinates,
        address: data.location.address || '',
        city: data.location.city || '',
        state: data.location.state || '',
      };
    }

    // ✅ Build offer data conditionally
    const offerData: any = {
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
    const offer = await Offer.create(offerData);

    // ✅ UPDATED: Find vendors matching service type
    try {
      const vendorQuery: any = {
        isVendor: true,
        'vendorProfile.isVerified': true,
      };

      // Match vendors based on service type
      if (data.serviceType === 'home') {
        // Only home service vendors
        vendorQuery['vendorProfile.vendorType'] = { 
          $in: [VendorType.HOME_SERVICE, VendorType.BOTH] 
        };
      } else if (data.serviceType === 'shop') {
        // Only in-shop vendors
        vendorQuery['vendorProfile.vendorType'] = { 
          $in: [VendorType.IN_SHOP, VendorType.BOTH] 
        };
      } else if (data.serviceType === 'both') {
        // All vendors
        vendorQuery['vendorProfile.vendorType'] = { 
          $in: [VendorType.HOME_SERVICE, VendorType.IN_SHOP, VendorType.BOTH] 
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

      const nearbyVendors = await User.find(vendorQuery).select('_id');
      const vendorIds = nearbyVendors.map(v => v._id.toString());

      if (vendorIds.length > 0) {
        // Populate client info for notification
        await offer.populate('client', 'firstName lastName');
        
        // Notify matching vendors about new offer
        await notificationHelper.notifyVendorsAboutNewOffer(offer, vendorIds);
        
        logger.info(`✅ Notified ${vendorIds.length} vendors about new ${data.serviceType} service offer`);
      } else {
        logger.warn(`⚠️ No matching vendors found for ${data.serviceType} service offer`);
      }
    } catch (notifyError) {
      logger.error('Failed to notify vendors about new offer:', notifyError);
      // Don't fail the offer creation if notification fails
    }

    logger.info(`Offer created: ${offer._id} by client ${clientId} (serviceType: ${data.serviceType})`);

    return offer;
  }

  /**
   * Get available offers for vendors with distance sorting
   * ✅ UPDATED: Filter by vendor's service type capability
   */
  public async getAvailableOffers(
    vendorId: string,
    filters?: {
      category?: string;
      priceMin?: number;
      priceMax?: number;
      location?: {
        latitude: number;
        longitude: number;
        maxDistance?: number;
      };
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ offers: IOffer[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // ✅ NEW: Get vendor's service type to filter offers
    const vendor = await User.findById(vendorId).select('vendorProfile.vendorType');
    if (!vendor || !vendor.vendorProfile?.vendorType) {
      throw new BadRequestError('Vendor profile not found');
    }

    const vendorType = vendor.vendorProfile.vendorType;

    // ✅ NEW: Build service type filter
    let serviceTypeFilter: any;
    if (vendorType === VendorType.HOME_SERVICE) {
      // Home service vendors can see: home OR both
      serviceTypeFilter = { $in: ['home', 'both'] };
    } else if (vendorType === VendorType.IN_SHOP) {
      // In-shop vendors can see: shop OR both
      serviceTypeFilter = { $in: ['shop', 'both'] };
    } else if (vendorType === VendorType.BOTH) {
      // Vendors offering both can see all offers
      serviceTypeFilter = { $in: ['home', 'shop', 'both'] };
    }

    // If location filter is provided, use aggregation with $geoNear
    if (filters?.location) {
      const maxDistance = (filters.location.maxDistance || 20) * 1000; // Convert km to meters

      const pipeline: any[] = [
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
        const priceMatch: any = {};
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
      pipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'client',
            foreignField: '_id',
            as: 'client',
          },
        },
        { $unwind: '$client' },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: '$category' }
      );

      const [offers, totalResult] = await Promise.all([
        Offer.aggregate(pipeline),
        Offer.aggregate([
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
    const query: any = {
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
      Offer.find(query)
        .populate('client', 'firstName lastName avatar')
        .populate('category', 'name icon')
        .populate('service', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Offer.countDocuments(query),
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
  public async respondToOffer(
    offerId: string,
    vendorId: string,
    data: {
      proposedPrice: number;
      message?: string;
      estimatedDuration?: number;
    }
  ): Promise<IOffer> {
    const offer = await Offer.findById(offerId).populate('client', 'firstName lastName');

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check if offer is still open
    if (offer.status !== 'open') {
      throw new BadRequestError('Offer is no longer open');
    }

    // Check expiration
    if (new Date() > offer.expiresAt) {
      offer.status = 'expired';
      await offer.save();
      throw new BadRequestError('Offer has expired');
    }

    // Check if vendor already responded
    const existingResponse = offer.responses.find(
      (r) => r.vendor.toString() === vendorId
    );

    if (existingResponse) {
      throw new BadRequestError('You have already responded to this offer');
    }

    // Verify vendor
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.isVendor || !vendor.vendorProfile?.isVerified) {
      throw new BadRequestError('Only verified vendors can respond to offers');
    }

    // ✅ NEW: Verify vendor can provide the requested service type
    const vendorType = vendor.vendorProfile.vendorType;
    const offerServiceType = offer.serviceType;

    if (offerServiceType === 'home' && vendorType === VendorType.IN_SHOP) {
      throw new BadRequestError('You cannot respond to home service offers as an in-shop vendor');
    }
    if (offerServiceType === 'shop' && vendorType === VendorType.HOME_SERVICE) {
      throw new BadRequestError('You cannot respond to in-shop offers as a home service vendor');
    }

    // Add response
    const response = {
      vendor: vendorId as any,
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
      await notificationHelper.notifyOfferResponse(offer, vendorId, response);
    } catch (notifyError) {
      logger.error('Failed to notify client about offer response:', notifyError);
    }

    logger.info(`Vendor ${vendorId} responded to offer ${offerId}`);

    return offer;
  }

  /**
   * Client submits counter offer to vendor response
   */
  public async counterOffer(
    offerId: string,
    clientId: string,
    responseId: string,
    counterPrice: number
  ): Promise<IOffer> {
    const offer = await Offer.findById(offerId);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify ownership
    if (offer.client.toString() !== clientId) {
      throw new ForbiddenError('Only the offer creator can submit counter offers');
    }

    // Check status
    if (offer.status !== 'open') {
      throw new BadRequestError('Offer is no longer open');
    }

    // Find response
    const response = offer.responses.find((r: any) => r._id?.toString() === responseId);
    if (!response) {
      throw new NotFoundError('Response not found');
    }

    // Add counter offer
    response.counterOffer = counterPrice;
    await offer.save();

    // ✅ Notify vendor about client's counter offer
    try {
      const vendorId = response.vendor.toString();
      await notificationHelper.notifyCounterOffer(offer, vendorId, counterPrice);
    } catch (notifyError) {
      logger.error('Failed to notify vendor about counter offer:', notifyError);
    }

    logger.info(`Counter offer submitted for offer ${offerId}`);

    return offer;
  }

  /**
   * Client accepts vendor response and creates booking
   * ✅ UPDATED: Now supports immediate payment (wallet or Paystack)
   */
  public async acceptResponse(
    offerId: string,
    clientId: string,
    responseId: string,
    paymentMethod?: 'wallet' | 'card' // ✅ NEW: Payment method
  ): Promise<{ offer: IOffer; booking: any; authorizationUrl?: string }> {
    const offer = await Offer.findById(offerId).populate('service').populate('client', 'firstName lastName email');

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify ownership
    if (offer.client._id.toString() !== clientId) {
      throw new ForbiddenError('Only the offer creator can accept responses');
    }

    // Check status
    if (offer.status !== 'open') {
      throw new BadRequestError('Offer is no longer open');
    }

    // Find response
    const response = offer.responses.find((r: any) => r._id?.toString() === responseId);
    if (!response) {
      throw new NotFoundError('Response not found');
    }

    // Mark response as accepted
    response.isAccepted = true;
    offer.selectedVendor = response.vendor;
    offer.selectedResponse = responseId as any;
    offer.status = 'accepted';
    offer.acceptedAt = new Date();

    // Get client for payment
    const client = await User.findById(clientId);
    if (!client || !client.email) {
      throw new NotFoundError('User not found or email not available');
    }

    // Calculate final price
    const finalPrice = response.counterOffer || response.proposedPrice;

    // Get vendor's commission rate
    const vendorId = response.vendor.toString();
    const commissionRate = await subscriptionService.getCommissionRate(vendorId);
    const platformFee = Math.round((finalPrice * commissionRate) / 100);
    const vendorAmount = finalPrice - platformFee;

    // Generate payment reference
    const reference = `OFFER-${Date.now()}-${generateRandomString(8)}`;

    // Determine payment method (default to 'card' if not specified)
    const selectedPaymentMethod = paymentMethod || 'card';

    // ==================== WALLET PAYMENT ====================
    if (selectedPaymentMethod === 'wallet') {
      // Check wallet balance
      if ((client.walletBalance || 0) < finalPrice) {
        throw new BadRequestError(
          `Insufficient wallet balance. Your balance: ₦${(client.walletBalance || 0).toLocaleString()}, Required: ₦${finalPrice.toLocaleString()}`
        );
      }

      // Deduct from wallet
      const previousBalance = client.walletBalance || 0;
      client.walletBalance = previousBalance - finalPrice;
      await client.save();

      try {
        // Create booking with payment
        const bookingData: any = {
          bookingType: BookingType.OFFER_BASED,
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
          status: BookingStatus.PENDING,
          paymentStatus: 'escrowed',
          paymentReference: reference,
          clientMarkedComplete: false,
          vendorMarkedComplete: false,
          hasDispute: false,
          hasReview: false,
          statusHistory: [
            {
              status: BookingStatus.PENDING,
              changedAt: new Date(),
              changedBy: clientId as any,
            },
          ],
        };

        if (offer.service) {
          bookingData.service = offer.service;
        }

        const booking = await Booking.create(bookingData);

        // Create payment record
        const payment = await Payment.create({
          user: clientId,
          booking: booking._id,
          amount: finalPrice,
          currency: 'NGN',
          status: PaymentStatus.COMPLETED,
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
        await transactionService.createTransaction({
          userId: clientId,
          type: TransactionType.BOOKING_PAYMENT,
          amount: finalPrice,
          description: `Payment for offer-based booking #${booking._id.toString().slice(-8)}`,
          booking: booking._id.toString(),
          payment: payment._id.toString(),
        });

        // Notify vendor
        await notificationHelper.notifyOfferAccepted(offer, vendorId, booking);
        await notificationHelper.notifyPaymentSuccessful(payment, clientId);

        logger.info(`✅ Offer accepted with wallet payment: ${offerId}, booking created: ${booking._id}`);

        return { offer, booking };

      } catch (error) {
        // Rollback wallet deduction
        client.walletBalance = previousBalance;
        await client.save();
        throw error;
      }
    }

    // ==================== PAYSTACK PAYMENT ====================
    if (selectedPaymentMethod === 'card') {
      // Create booking in PENDING state
      const bookingData: any = {
        bookingType: BookingType.OFFER_BASED,
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
        status: BookingStatus.PENDING,
        paymentStatus: 'pending',
        paymentReference: reference,
        paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        clientMarkedComplete: false,
        vendorMarkedComplete: false,
        hasDispute: false,
        hasReview: false,
        statusHistory: [
          {
            status: BookingStatus.PENDING,
            changedAt: new Date(),
            changedBy: clientId as any,
          },
        ],
      };

      if (offer.service) {
        bookingData.service = offer.service;
      }

      const booking = await Booking.create(bookingData);
      offer.bookingId = booking._id;
      await offer.save();

      // Initialize Paystack payment
      const paymentData = await paystackHelper.initializePayment(
        client.email,
        finalPrice,
        reference,
        {
          bookingId: booking._id.toString(),
          clientId: clientId,
          vendorId: vendorId,
          offerId: offerId,
          serviceId: booking.service,
          commissionRate,
          platformFee,
          vendorAmount,
          paymentType: 'offer_booking',
        }
      );

      logger.info(`💳 Paystack payment initialized for offer booking: ${reference}`);

      return {
        offer,
        booking: {
          ...booking.toObject(),
          authorizationUrl: paymentData.authorization_url, // ✅ Return URL for frontend
        },
      };
    }

    throw new BadRequestError('Invalid payment method. Use "wallet" or "card"');
  }

  /**
   * Get offer by ID
   */
  public async getOfferById(offerId: string, userId: string): Promise<IOffer> {
    const offer = await Offer.findById(offerId)
      .populate('client', 'firstName lastName avatar')
      .populate('category', 'name icon')
      .populate('service', 'name images')
      .populate('responses.vendor', 'firstName lastName vendorProfile');

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify access
    const isClient = offer.client._id.toString() === userId;
    const hasResponded = offer.responses.some((r) => r.vendor._id.toString() === userId);

    if (!isClient && !hasResponded) {
      throw new ForbiddenError('Not authorized to view this offer');
    }

    return offer;
  }

  /**
   * Get client offers
   */
  public async getClientOffers(
    clientId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ offers: IOffer[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const [offers, total] = await Promise.all([
      Offer.find({ client: clientId })
        .populate('category', 'name icon')
        .populate('service', 'name')
        .populate('responses.vendor', 'firstName lastName vendorProfile')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Offer.countDocuments({ client: clientId }),
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
  public async getVendorResponses(
    vendorId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ offers: IOffer[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const [offers, total] = await Promise.all([
      Offer.find({ 'responses.vendor': vendorId })
        .populate('client', 'firstName lastName avatar')
        .populate('category', 'name icon')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Offer.countDocuments({ 'responses.vendor': vendorId }),
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
  public async closeOffer(offerId: string, clientId: string): Promise<IOffer> {
    const offer = await Offer.findById(offerId);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Verify ownership
    if (offer.client.toString() !== clientId) {
      throw new ForbiddenError('Only the offer creator can close offers');
    }

    if (offer.status !== 'open') {
      throw new BadRequestError('Only open offers can be closed');
    }

    offer.status = 'closed';
    await offer.save();

    logger.info(`Offer closed: ${offerId}`);

    return offer;
  }

  /**
   * Vendor accepts client's counter offer
   */
  public async acceptCounterOffer(
    offerId: string,
    responseId: string,
    vendorId: string
  ): Promise<{ offer: IOffer; booking: any }> {
    const offer = await Offer.findById(offerId).populate('service').populate('client', 'firstName lastName');

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== 'open') {
      throw new BadRequestError('This offer is no longer open');
    }

    const response = offer.responses.find(
      (r: any) => r._id?.toString() === responseId && r.vendor.toString() === vendorId
    );

    if (!response) {
      throw new NotFoundError('Response not found');
    }

    if (!response.counterOffer) {
      throw new BadRequestError('No counter offer to accept');
    }

    if (response.isAccepted) {
      throw new BadRequestError('This response has already been accepted');
    }

    // Mark response as accepted
    response.isAccepted = true;
    response.acceptedAt = new Date();
    offer.selectedVendor = response.vendor;
    offer.selectedResponse = responseId as any;
    offer.status = 'accepted';
    offer.acceptedAt = new Date();

    // Create booking with the counter offer price
    const booking = await Booking.create({
      bookingType: BookingType.OFFER_BASED,
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
      status: BookingStatus.PENDING,
      paymentStatus: 'pending',
      clientMarkedComplete: false,
      vendorMarkedComplete: false,
      hasDispute: false,
      hasReview: false,
      statusHistory: [
        {
          status: BookingStatus.PENDING,
          changedAt: new Date(),
          changedBy: vendorId as any,
        },
      ],
    });

    offer.bookingId = booking._id;
    await offer.save();

    // ✅ Notify client that vendor accepted their counter offer
    try {
      await notificationHelper.notifyOfferAccepted(offer, vendorId, booking);
    } catch (notifyError) {
      logger.error('Failed to notify client about accepted counter offer:', notifyError);
    }

    logger.info(
      `Vendor ${vendorId} accepted counter offer for ${offerId}, booking created: ${booking._id}`
    );

    return { offer, booking };
  }

  /**
   * Vendor makes counter offer to client's counter
   */
  public async vendorCounterOffer(
    offerId: string,
    responseId: string,
    vendorId: string,
    newPrice: number
  ): Promise<IOffer> {
    const offer = await Offer.findById(offerId);

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== 'open') {
      throw new BadRequestError('This offer is no longer open');
    }

    const response = offer.responses.find(
      (r: any) => r._id?.toString() === responseId && r.vendor.toString() === vendorId
    );

    if (!response) {
      throw new NotFoundError('Response not found');
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
      await notificationHelper.notifyCounterOffer(offer, vendorId, newPrice);
    } catch (notifyError) {
      logger.error('Failed to notify client about vendor counter offer:', notifyError);
    }

    logger.info(`Vendor ${vendorId} countered with ₦${newPrice} for offer ${offerId}`);

    return offer;
  }


  /**
 * Get all offers (admin)
 */
public async getAllOffers(
  filters?: {
    status?: string;
    category?: string;
    client?: string;
    startDate?: Date;
    endDate?: Date;
  },
  page: number = 1,
  limit: number = 20
): Promise<{ offers: IOffer[]; total: number; page: number; totalPages: number }> {
  const { skip } = parsePaginationParams(page, limit);

  const query: any = {};

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
    Offer.find(query)
      .populate('client', 'firstName lastName email phone')
      .populate('category', 'name icon')
      .populate('service', 'name')
      .populate('responses.vendor', 'firstName lastName vendorProfile')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Offer.countDocuments(query),
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
public async getOfferStats(): Promise<{
  total: number;
  open: number;
  accepted: number;
  closed: number;
  expired: number;
  totalResponses: number;
  avgResponsesPerOffer: number;
}> {
  const [
    total,
    open,
    accepted,
    closed,
    expired,
    allOffers,
  ] = await Promise.all([
    Offer.countDocuments(),
    Offer.countDocuments({ status: 'open' }),
    Offer.countDocuments({ status: 'accepted' }),
    Offer.countDocuments({ status: 'closed' }),
    Offer.countDocuments({ status: 'expired' }),
    Offer.find({}, 'responses'),
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
public async deleteOffer(offerId: string): Promise<void> {
  const offer = await Offer.findById(offerId);
  
  if (!offer) {
    throw new NotFoundError('Offer not found');
  }

  if (offer.status === 'accepted' && offer.bookingId) {
    throw new BadRequestError('Cannot delete an offer with an active booking');
  }

  await Offer.findByIdAndDelete(offerId);
  logger.info(`Offer deleted: ${offerId}`);
}
}

export default new OfferService();