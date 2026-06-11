import Order, { IOrder, OrderStatus, DeliveryType } from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import deliveryService from './delivery.service';
import notificationHelper from '../utils/notificationHelper';
import transactionService from './transaction.service';
import socketService from '../socket/socket.service';
import Payment from '../models/Payment';
import { PaymentStatus, TransactionType, UserRole } from '../types';

export interface PreparedOrderData {
  customerId: string;
  orderItems: Array<{
    product: string;
    name: string;
    price: number;
    quantity: number;
    selectedVariant?: { name: string; option: string };
    subtotal: number;
  }>;
  sellerId: string;
  sellerType: 'vendor' | 'admin';
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryType: DeliveryType;
  deliveryAddress?: any;
  paymentMethod: string;
  customerNotes?: string;
  deliveryDistance: number;
  estimatedDeliveryTime?: string;
}

class OrderService {
  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const count = await Order.countDocuments();
    const timestamp = Date.now();
    const orderNumber = `ORD-${timestamp}-${(count + 1).toString().padStart(6, '0')}`;
    return orderNumber;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    coords1: [number, number],
    coords2: [number, number]
  ): number {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Create a new order with distance-based delivery fee
   */
  public async createOrder(
    customerId: string,
    orderData: {
      items: Array<{
        product: string;
        quantity: number;
        selectedVariant?: { name: string; option: string };
      }>;
      deliveryType: DeliveryType;
      deliveryAddress?: {
        fullName: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        country: string;
        zipCode?: string;
        additionalInfo?: string;
        coordinates?: [number, number];
      };
      paymentMethod: string;
      customerNotes?: string;
    }
  ): Promise<IOrder> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const orderItems = [];
      let subtotal = 0;
      let seller: mongoose.Types.ObjectId | null = null;
      let sellerType: 'vendor' | 'admin' = 'vendor';
      let deliveryFee = 0;
      let vendorLocation: any = null;
      let firstProduct: any = null;
      let deliveryDistance = 0;
      let deliveryCalculation: any = null;

      for (const item of orderData.items) {
        const product = await Product.findById(item.product)
          .populate('seller')
          .session(session);

        if (!product) {
          throw new NotFoundError(`Product ${item.product} not found`);
        }

        if (!product.isInStock()) {
          throw new BadRequestError(`Product ${product.name} is out of stock`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`
          );
        }

        if (!seller) {
          seller = product.seller._id;
          sellerType = product.sellerType;
          firstProduct = product;
          
          if (sellerType === 'vendor') {
            const vendorUser = await User.findById(seller).session(session);
            vendorLocation = vendorUser?.vendorProfile?.location || vendorUser?.location;
          } else {
            vendorLocation = product.location;
          }
        } else if (seller.toString() !== product.seller._id.toString()) {
          throw new BadRequestError('All products must be from the same seller');
        }

        const price = product.calculateFinalPrice();
        const itemSubtotal = price * item.quantity;

        orderItems.push({
          product: product._id,
          name: product.name,
          price,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant,
          subtotal: itemSubtotal,
        });

        subtotal += itemSubtotal;
        await product.decrementStock(item.quantity);
      }

      if (orderData.deliveryType === DeliveryType.HOME_DELIVERY) {
        if (!firstProduct) {
          throw new BadRequestError('No products found in order');
        }

        if (firstProduct.deliveryOptions.freeDelivery) {
          deliveryFee = 0;
          logger.info('Free delivery applied to order');
        } else {
          deliveryService.validateLocations(vendorLocation, {
            type: 'Point',
            coordinates: orderData.deliveryAddress?.coordinates
          });

          deliveryCalculation = deliveryService.calculateDeliveryFeeFromCoordinates(
            vendorLocation.coordinates,
            orderData.deliveryAddress!.coordinates!,
            (firstProduct.deliveryOptions as any)?.deliveryPricing || undefined,
            false
          );

          if (!deliveryCalculation.canDeliver) {
            throw new BadRequestError(deliveryCalculation.message || 'Delivery not available to your location');
          }

          deliveryFee = deliveryCalculation.deliveryFee;
          deliveryDistance = deliveryCalculation.distance;

          logger.info(
            `Delivery fee calculated: ₦${deliveryFee} for ${deliveryCalculation.distance}km - ETA: ${deliveryCalculation.estimatedDeliveryTime}`
          );
        }
      }

      const totalAmount = subtotal + deliveryFee;
      const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate orderNumber manually
      const orderNumber = await this.generateOrderNumber();

      // Create order with orderNumber
      const orderDoc = new Order({
        orderNumber,
        customer: customerId,
        seller: seller!,
        sellerType,
        items: orderItems,
        subtotal,
        deliveryFee,
        totalAmount,
        deliveryType: orderData.deliveryType,
        deliveryAddress: orderData.deliveryAddress,
        paymentMethod: orderData.paymentMethod,
        paymentReference,
        escrowedAmount: totalAmount,
        customerNotes: orderData.customerNotes,
        status: OrderStatus.PENDING,
        statusHistory: [{
          status: OrderStatus.PENDING,
          updatedBy: mongoose.Types.ObjectId.createFromHexString(customerId),
          updatedAt: new Date(),
        }],
      });

      // Save with session
      await orderDoc.save({ session });

      // Populate seller for notification
      await orderDoc.populate('seller', 'firstName lastName email');

      await session.commitTransaction();
      
      // ✅ Notify seller about new order with distance info
      try {
        await notificationHelper.notifySellerNewOrder(orderDoc, deliveryDistance);
      } catch (notifyError) {
        logger.error('Failed to notify seller about new order:', notifyError);
      }

      // ✅ Notify customer about delivery fee calculation
      if (deliveryFee > 0 && deliveryCalculation) {
        try {
          await notificationHelper.notifyDeliveryFeeCalculated(
            customerId,
            orderDoc._id.toString(),
            deliveryFee,
            deliveryDistance,
            deliveryCalculation.estimatedDeliveryTime
          );
        } catch (notifyError) {
          logger.error('Failed to notify customer about delivery fee:', notifyError);
        }
      }

      logger.info(`Order created: ${orderDoc._id} (${orderNumber}) with delivery fee: ₦${deliveryFee}`);

      return orderDoc;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate delivery fee preview (before order creation)
   */
  public async calculateDeliveryFeePreview(
    productId: string,
    customerLocation: { coordinates: [number, number] }
  ): Promise<{
    distance: number;
    deliveryFee: number;
    estimatedDeliveryTime: string;
    canDeliver: boolean;
    message?: string;
  }> {
    const product = await Product.findById(productId).populate('seller');

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    let vendorLocation: any = null;
    
    if (product.sellerType === 'vendor') {
      const vendorUser = await User.findById(product.seller);
      vendorLocation = vendorUser?.vendorProfile?.location || vendorUser?.location;
    } else {
      vendorLocation = product.location;
    }

    deliveryService.validateLocations(vendorLocation, {
      type: 'Point',
      coordinates: customerLocation.coordinates
    });

    const deliveryCalculation = deliveryService.calculateDeliveryFeeFromCoordinates(
      vendorLocation.coordinates,
      customerLocation.coordinates,
      (product.deliveryOptions as any)?.deliveryPricing || undefined,
      product.deliveryOptions.freeDelivery || false
    );

    return deliveryCalculation;
  }

  /**
   * Validate order data and calculate fees without any database writes.
   * Call this before initiating payment to ensure everything is valid.
   */
  public async prepareOrderData(
    customerId: string,
    orderData: {
      items: Array<{
        product: string;
        quantity: number;
        selectedVariant?: { name: string; option: string };
      }>;
      deliveryType: DeliveryType;
      deliveryAddress?: {
        fullName: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        country: string;
        zipCode?: string;
        additionalInfo?: string;
        coordinates?: [number, number];
      };
      paymentMethod: string;
      customerNotes?: string;
    }
  ): Promise<PreparedOrderData> {
    const orderItems: PreparedOrderData['orderItems'] = [];
    let subtotal = 0;
    let sellerId: string | null = null;
    let sellerType: 'vendor' | 'admin' = 'vendor';
    let deliveryFee = 0;
    let vendorLocation: any = null;
    let firstProduct: any = null;
    let deliveryDistance = 0;
    let estimatedDeliveryTime: string | undefined;

    for (const item of orderData.items) {
      const product = await Product.findById(item.product).populate('seller');

      if (!product) throw new NotFoundError(`Product ${item.product} not found`);
      if (!product.isInStock()) throw new BadRequestError(`Product ${product.name} is out of stock`);
      if (product.stock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`
        );
      }

      if (!sellerId) {
        sellerId = product.seller._id.toString();
        sellerType = product.sellerType;
        firstProduct = product;

        if (sellerType === 'vendor') {
          const vendorUser = await User.findById(sellerId);
          vendorLocation = vendorUser?.vendorProfile?.location || vendorUser?.location;
        } else {
          vendorLocation = product.location;
        }
      } else if (sellerId !== product.seller._id.toString()) {
        throw new BadRequestError('All products must be from the same seller');
      }

      const price = product.calculateFinalPrice();
      const itemSubtotal = price * item.quantity;

      orderItems.push({
        product: product._id.toString(),
        name: product.name,
        price,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
    }

    if (orderData.deliveryType === DeliveryType.HOME_DELIVERY) {
      if (!firstProduct) throw new BadRequestError('No products found in order');

      if (firstProduct.deliveryOptions.freeDelivery) {
        deliveryFee = 0;
      } else {
        deliveryService.validateLocations(vendorLocation, {
          type: 'Point',
          coordinates: orderData.deliveryAddress?.coordinates,
        });

        const deliveryCalculation = deliveryService.calculateDeliveryFeeFromCoordinates(
          vendorLocation.coordinates,
          orderData.deliveryAddress!.coordinates!,
          (firstProduct.deliveryOptions as any)?.deliveryPricing || undefined,
          false
        );

        if (!deliveryCalculation.canDeliver) {
          throw new BadRequestError(
            deliveryCalculation.message || 'Delivery not available to your location'
          );
        }

        deliveryFee = deliveryCalculation.deliveryFee;
        deliveryDistance = deliveryCalculation.distance;
        estimatedDeliveryTime = deliveryCalculation.estimatedDeliveryTime;
      }
    }

    return {
      customerId,
      orderItems,
      sellerId: sellerId!,
      sellerType,
      subtotal,
      deliveryFee,
      totalAmount: subtotal + deliveryFee,
      deliveryType: orderData.deliveryType,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod,
      customerNotes: orderData.customerNotes,
      deliveryDistance,
      estimatedDeliveryTime,
    };
  }

  /**
   * Create the order and decrement stock atomically.
   * Only call this after payment has been confirmed.
   */
  public async finalizeOrder(
    preparedData: PreparedOrderData,
    paymentReference: string,
    session?: mongoose.ClientSession
  ): Promise<IOrder> {
    // Atomically decrement stock for each item; fail if stock is now insufficient
    for (const item of preparedData.orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, session }
      );
      if (!updated) {
        throw new BadRequestError(
          `Insufficient stock for "${item.name}" — it may have sold out just now. Payment will be refunded.`
        );
      }
    }

    const orderNumber = await this.generateOrderNumber();

    const orderDoc = new Order({
      orderNumber,
      customer: preparedData.customerId,
      seller: preparedData.sellerId,
      sellerType: preparedData.sellerType,
      items: preparedData.orderItems,
      subtotal: preparedData.subtotal,
      deliveryFee: preparedData.deliveryFee,
      totalAmount: preparedData.totalAmount,
      deliveryType: preparedData.deliveryType,
      deliveryAddress: preparedData.deliveryAddress,
      paymentMethod: preparedData.paymentMethod,
      paymentReference,
      escrowedAmount: preparedData.totalAmount,
      customerNotes: preparedData.customerNotes,
      isPaid: true,
      paidAt: new Date(),
      escrowStatus: 'locked',
      escrowedAt: new Date(),
      status: OrderStatus.PROCESSING,
      statusHistory: [
        {
          status: OrderStatus.PROCESSING,
          updatedBy: mongoose.Types.ObjectId.createFromHexString(preparedData.customerId),
          updatedAt: new Date(),
        },
      ],
    });

    if (session) {
      await orderDoc.save({ session });
    } else {
      await orderDoc.save();
    }

    try {
      await notificationHelper.notifySellerNewOrder(orderDoc, preparedData.deliveryDistance);
    } catch (e) {
      logger.error('Failed to notify seller about new order:', e);
    }

    logger.info(`Order finalized after payment: ${orderDoc._id} (${orderNumber})`);
    return orderDoc;
  }

  /**
   * Update order payment status (after payment confirmation)
   */
  public async confirmPayment(
    orderId: string,
    paymentId: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.payment = mongoose.Types.ObjectId.createFromHexString(paymentId);
    order.escrowStatus = 'locked';
    order.escrowedAt = new Date();
    order.status = OrderStatus.CONFIRMED;

    await order.addStatusUpdate(OrderStatus.CONFIRMED, order.customer.toString(), 'Payment confirmed');

    logger.info(`Order payment confirmed: ${orderId}`);

    return order;
  }

  /**
   * Get order by ID
   */
  public async getOrderById(orderId: string): Promise<IOrder> {
    const order = await Order.findById(orderId)
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('seller', 'firstName lastName email phone avatar vendorProfile')
      .populate('items.product', 'name images')
      .populate('payment');

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  /**
   * Get customer orders
   */
  public async getCustomerOrders(
    customerId: string,
    status?: OrderStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<{ orders: IOrder[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = { customer: customerId };
    if (status) {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('seller', 'firstName lastName avatar vendorProfile')
        .populate('items.product', 'name images')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get seller orders
   */
  public async getSellerOrders(
    sellerId: string,
    status?: OrderStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<{ orders: IOrder[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = { seller: sellerId };
    if (status) {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'firstName lastName phone avatar')
        .populate('items.product', 'name images')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update order status (seller)
   */
  public async updateOrderStatus(
    orderId: string,
    sellerId: string,
    status: OrderStatus,
    note?: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.seller.toString() !== sellerId) {
      throw new ForbiddenError('You can only update your own orders');
    }

    if (!order.isPaid) {
      throw new BadRequestError('Order must be paid before status can be updated');
    }

    // Validate status transition
    const validTransitions: { [key: string]: OrderStatus[] } = {
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${order.status} to ${status}`);
    }

    await order.addStatusUpdate(status, sellerId, note);

    // ✅ Notify customer about delivery status updates
    if (status === OrderStatus.SHIPPED || status === OrderStatus.OUT_FOR_DELIVERY) {
      try {
        let estimatedTime: string | undefined;
        
        // Calculate ETA based on delivery distance if available
        if (order.deliveryAddress?.coordinates && order.seller) {
          const seller = await User.findById(order.seller);
          const vendorLocation = seller?.vendorProfile?.location || seller?.location;
          
          if (vendorLocation?.coordinates) {
            const distance = this.calculateDistance(
              vendorLocation.coordinates,
              order.deliveryAddress.coordinates
            );
            
            // Rough estimate: 30 km/h average speed
            const hoursToDeliver = distance / 30;
            const daysToDeliver = Math.ceil(hoursToDeliver / 8); // 8 hour work day
            
            if (status === OrderStatus.SHIPPED) {
              estimatedTime = daysToDeliver === 1 ? 'Tomorrow' : `${daysToDeliver} days`;
            } else if (status === OrderStatus.OUT_FOR_DELIVERY) {
              estimatedTime = hoursToDeliver < 2 ? 'Within 2 hours' : `${Math.ceil(hoursToDeliver)} hours`;
            }
          }
        }
        
        await notificationHelper.notifyOrderDelivery(
          order,
          status === OrderStatus.SHIPPED ? 'shipped' : 'out_for_delivery',
          estimatedTime
        );
      } catch (notifyError) {
        logger.error('Failed to notify customer about order status:', notifyError);
      }
    }

    logger.info(`Order status updated: ${orderId} to ${status}`);

    return order;
  }
/**
 * Confirm delivery (customer or seller)
 */
public async confirmDelivery(
  orderId: string,
  userId: string,
  role: 'customer' | 'seller'
): Promise<IOrder> {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Verify user
  if (role === 'customer' && order.customer.toString() !== userId) {
    throw new ForbiddenError('Unauthorized');
  }

  if (role === 'seller' && order.seller.toString() !== userId) {
    throw new ForbiddenError('Unauthorized');
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new BadRequestError('Order must be in delivered status');
  }

  // ✅ CHECK FOR ACTIVE DISPUTE - CRITICAL!
  if (order.hasDispute) {
    throw new BadRequestError(
      'Cannot confirm delivery while there is an active dispute. ' +
      'Please resolve the dispute first.'
    );
  }

  if (role === 'customer') {
    order.customerConfirmedDelivery = true;
    order.customerConfirmedAt = new Date();
  } else {
    order.sellerConfirmedDelivery = true;
    order.sellerConfirmedAt = new Date();
  }

  // If both parties confirmed, complete the order and release escrow
  if (order.customerConfirmedDelivery && order.sellerConfirmedDelivery) {
    order.status = OrderStatus.COMPLETED;
    order.escrowStatus = 'released';
    order.escrowReleaseDate = new Date();
    
    await order.addStatusUpdate(
      OrderStatus.COMPLETED,
      userId,
      'Both parties confirmed delivery - escrow released'
    );

    // ✅ RELEASE FUNDS TO SELLER
    await this.releaseFundsToSeller(order);
  }

  await order.save();

  logger.info(`Order delivery confirmed by ${role}: ${orderId}`);

  return order;
}

 /**
 * Cancel order
 */
public async cancelOrder(
  orderId: string,
  userId: string,
  reason: string,
  userRole?: UserRole
): Promise<IOrder> {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (!order.canBeCancelled()) {
    throw new BadRequestError('Order cannot be cancelled at this stage');
  }

  const isCustomer = order.customer.toString() === userId;
  const isSeller = order.seller.toString() === userId;
  const isAdmin = userRole
    ? [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCIAL_ADMIN, UserRole.SUPPORT].includes(userRole)
    : false;

  if (!isCustomer && !isSeller && !isAdmin) {
    throw new ForbiddenError('You are not authorised to cancel this order');
  }

  order.status = OrderStatus.CANCELLED;
  order.cancellationReason = reason;
  order.cancelledBy = mongoose.Types.ObjectId.createFromHexString(userId);
  order.cancelledAt = new Date();

  if (order.isPaid) {
    await this.processOrderRefund(order);
  }

  // Restore product stock
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      await product.incrementStock(item.quantity);
    }
  }

  await order.addStatusUpdate(OrderStatus.CANCELLED, userId, reason);

  logger.info(`Order cancelled: ${orderId} by ${isAdmin ? 'admin' : isCustomer ? 'customer' : 'seller'}`);

  const cancelledByRole = isAdmin ? 'admin' : isCustomer ? 'customer' : 'seller';
  await notificationHelper.notifyOrderCancelled(order, cancelledByRole, reason);

  return order;
}

public async deleteOrder(orderId: string): Promise<void> {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Refund customer if the order was paid before deletion
  if (order.isPaid && order.status !== OrderStatus.CANCELLED) {
    await this.processOrderRefund(order);

    // Restore stock as well
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.incrementStock(item.quantity);
      }
    }
  }

  order.isDeleted = true;
  order.deletedAt = new Date();
  await order.save();

  logger.info(`Order soft-deleted by admin: ${orderId}`);
}

/**
 * Process refund for cancelled order
 */
private async processOrderRefund(order: IOrder): Promise<void> {
  const payment = await Payment.findById(order.payment);
  
  if (!payment) {
    logger.error(`Payment not found for order ${order._id}`);
    return;
  }

  // Find the customer
  const customer = await User.findById(order.customer);
  
  if (!customer) {
    logger.error(`Customer not found for order ${order._id}`);
    return;
  }

  // Refund to wallet regardless of payment method
  const previousBalance = customer.walletBalance || 0;
  customer.walletBalance = previousBalance + order.totalAmount;
  await customer.save();

  // Create refund transaction
  await transactionService.createTransaction({
    userId: order.customer.toString(),
    type: TransactionType.REFUND,
    amount: order.totalAmount,
    description: `Refund for cancelled order #${order.orderNumber}`,
    order: order._id.toString(),
    payment: payment._id.toString(),
  });

  // Update payment and order status
  payment.status = PaymentStatus.REFUNDED;
  await payment.save();

  order.escrowStatus = 'refunded';

  // Log refund
  const paymentMethodLabel = payment.paymentMethod === 'wallet' || payment.paymentMethod === 'card' 
    ? 'card payment' 
    : 'wallet';
    
  logger.info(
    `💰 Refunded ₦${order.totalAmount.toLocaleString()} to customer wallet ` +
    `(original payment: ${paymentMethodLabel}) for order ${order._id}`
  );

  // ✅ Notify customer about refund
  await notificationHelper.notifyOrderRefundProcessed(
    order,
    order.totalAmount,
    customer.walletBalance,
    payment.paymentMethod === 'wallet' || payment.paymentMethod === 'card'
      ? 'Refunded to your wallet (original payment was via card)'
      : 'Refunded to your wallet'
  );

  // ✅ Emit real-time event
  const refundMessage = payment.paymentMethod === 'wallet' || payment.paymentMethod === 'card'
    ? 'Refunded to your wallet (original payment was via card)'
    : 'Refunded to your wallet';

  socketService.emitPaymentEvent(order.customer.toString(), 'order:refund:success', {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    newBalance: customer.walletBalance,
    previousBalance: previousBalance,
    paymentMethod: payment.paymentMethod,
    message: refundMessage,
  });

  logger.info(
    `✅ Refund completed: Customer ${order.customer} | ` +
    `Amount: ₦${order.totalAmount.toLocaleString()} | ` +
    `New Balance: ₦${customer.walletBalance.toLocaleString()}`
  );
}
  /**
   * Get all orders (admin)
   */
  public async getAllOrders(
    filters?: {
      status?: OrderStatus;
      seller?: string;
      customer?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: IOrder[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.seller) {
      query.seller = filters.seller;
    }

    if (filters?.customer) {
      query.customer = filters.customer;
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

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'firstName lastName email phone')
        .populate('seller', 'firstName lastName email phone vendorProfile')
        .populate('items.product', 'name images')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Add tracking information (seller)
   */
  public async addTrackingInfo(
    orderId: string,
    sellerId: string,
    trackingNumber: string,
    courierService: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.seller.toString() !== sellerId) {
      throw new ForbiddenError('Unauthorized');
    }

    order.trackingNumber = trackingNumber;
    order.courierService = courierService;

    await order.save();

    logger.info(`Tracking info added to order: ${orderId}`);

    return order;
  }



/**
 * Release escrow funds to seller
 */
private async releaseFundsToSeller(order: IOrder): Promise<void> {
  // Get payment record
  const payment = await Payment.findById(order.payment);
  
  if (!payment) {
    logger.error(`Payment not found for order ${order._id}`);
    return;
  }

  // Find the seller
  const seller = await User.findById(order.seller);
  
  if (!seller) {
    logger.error(`Seller not found for order ${order._id}`);
    return;
  }

  // No commission — seller receives full amount
  const platformFee = 0;
  const sellerAmount = order.totalAmount;

  // Add money to seller's wallet
  const previousBalance = seller.walletBalance || 0;
  seller.walletBalance = previousBalance + sellerAmount;
  await seller.save();

  // Create transaction for seller earnings
  await transactionService.createTransaction({
    userId: seller._id.toString(),
    type: TransactionType.ORDER_EARNING,
    amount: sellerAmount,
    description: `Earnings from completed order #${order.orderNumber}`,
    order: order._id.toString(),
    payment: payment._id.toString(),
  });

  // Update payment record
  payment.escrowStatus = 'released';
  payment.escrowedAt = new Date();
  await payment.save();

  logger.info(
    `✅ Released ₦${sellerAmount.toLocaleString()} to seller ${seller._id} ` +
    `(Platform fee: ₦${platformFee.toLocaleString()}) for order ${order._id}`
  );

  // ✅ Notify seller about payment
  await notificationHelper.notifySellerPaymentReleased(
    order,
    sellerAmount,
    platformFee,
    seller.walletBalance
  );

  // ✅ Emit real-time event
  socketService.emitPaymentEvent(seller._id.toString(), 'order:payment:released', {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    amount: sellerAmount,
    platformFee: platformFee,
    newBalance: seller.walletBalance,
  });
}
}

export default new OrderService();