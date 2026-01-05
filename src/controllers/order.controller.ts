import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import orderService from '../services/order.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { OrderStatus } from '../models/Order';
// import logger from '../utils/logger';

class OrderController {
  /**
   * Calculate delivery fee preview
   * GET /api/v1/orders/delivery-fee-preview
   */
  public calculateDeliveryFee = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId, latitude, longitude } = req.query;

      const deliveryCalculation = await orderService.calculateDeliveryFeePreview(
        productId as string,
        {
          coordinates: [parseFloat(longitude as string), parseFloat(latitude as string)],
        }
      );

      return ResponseHandler.success(
        res,
        deliveryCalculation.canDeliver 
          ? 'Delivery fee calculated successfully'
          : 'Delivery not available',
        {
          ...deliveryCalculation,
        }
      );
    }
  );

  /**
   * Create a new order
   * POST /api/v1/orders
   */
  public createOrder = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const customerId = req.user!.id;

      const order = await orderService.createOrder(customerId, req.body);

      return ResponseHandler.success(
        res,
        'Order created successfully. Please proceed to payment.',
        {
          order,
          paymentReference: order.paymentReference,
          totalAmount: order.totalAmount,
        },
        201
      );
    }
  );

  /**
   * Confirm payment (called after payment gateway webhook)
   * POST /api/v1/orders/:orderId/confirm-payment
   */
  public confirmPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;
      const { paymentId } = req.body;

      const order = await orderService.confirmPayment(orderId, paymentId);

      return ResponseHandler.success(res, 'Payment confirmed. Order is now being processed.', {
        order,
      });
    }
  );

  /**
   * Get order by ID
   * GET /api/v1/orders/:orderId
   */
  public getOrderById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;

      const order = await orderService.getOrderById(orderId);

      return ResponseHandler.success(res, 'Order retrieved successfully', {
        order,
      });
    }
  );

  /**
   * Get customer's orders
   * GET /api/v1/orders/customer/my-orders
   */
  public getMyOrders = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const customerId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as OrderStatus;

      const result = await orderService.getCustomerOrders(customerId, status, page, limit);

      return ResponseHandler.paginated(
        res,
        'Your orders retrieved successfully',
        result.orders,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get seller's orders
   * GET /api/v1/orders/seller/my-orders
   */
  public getMySellerOrders = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const sellerId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as OrderStatus;

      const result = await orderService.getSellerOrders(sellerId, status, page, limit);

      return ResponseHandler.paginated(
        res,
        'Your orders retrieved successfully',
        result.orders,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get all orders (admin)
   * GET /api/v1/orders
   */
  public getAllOrders = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: any = {
        status: req.query.status as OrderStatus,
        seller: req.query.seller as string,
        customer: req.query.customer as string,
      };

      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const result = await orderService.getAllOrders(filters, page, limit);

      return ResponseHandler.paginated(
        res,
        'Orders retrieved successfully',
        result.orders,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Update order status (seller)
   * PATCH /api/v1/orders/:orderId/status
   */
  public updateOrderStatus = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;
      const sellerId = req.user!.id;
      const { status, note } = req.body;

      const order = await orderService.updateOrderStatus(orderId, sellerId, status, note);

      return ResponseHandler.success(res, 'Order status updated successfully', {
        order,
      });
    }
  );

  /**
   * Confirm delivery (customer or seller)
   * POST /api/v1/orders/:orderId/confirm-delivery
   */
  public confirmDelivery = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;
      const userId = req.user!.id;
      const { role } = req.body; // 'customer' or 'seller'

      const order = await orderService.confirmDelivery(orderId, userId, role);

      const message = order.status === OrderStatus.COMPLETED
        ? 'Delivery confirmed. Order completed and payment released to seller!'
        : `Delivery confirmed by ${role}. Waiting for ${role === 'customer' ? 'seller' : 'customer'} confirmation.`;

      return ResponseHandler.success(res, message, {
        order,
        isCompleted: order.status === OrderStatus.COMPLETED,
      });
    }
  );

  /**
   * Cancel order
   * POST /api/v1/orders/:orderId/cancel
   */
  public cancelOrder = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;
      const userId = req.user!.id;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(orderId, userId, reason);

      return ResponseHandler.success(res, 'Order cancelled successfully', {
        order,
        refundIssued: order.isPaid,
      });
    }
  );

  /**
   * Add tracking information (seller)
   * POST /api/v1/orders/:orderId/tracking
   */
  public addTrackingInfo = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orderId } = req.params;
      const sellerId = req.user!.id;
      const { trackingNumber, courierService } = req.body;

      const order = await orderService.addTrackingInfo(
        orderId,
        sellerId,
        trackingNumber,
        courierService
      );

      return ResponseHandler.success(res, 'Tracking information added successfully', {
        order,
      });
    }
  );

  /**
   * Get order statistics (seller)
   * GET /api/v1/orders/seller/stats
   */
  public getSellerOrderStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const sellerId = req.user!.id;

      // Get counts for different statuses
      const [
        pendingOrders,
        processingOrders,
        shippedOrders,
        completedOrders,
        cancelledOrders,
      ] = await Promise.all([
        orderService.getSellerOrders(sellerId, OrderStatus.PENDING, 1, 1),
        orderService.getSellerOrders(sellerId, OrderStatus.PROCESSING, 1, 1),
        orderService.getSellerOrders(sellerId, OrderStatus.SHIPPED, 1, 1),
        orderService.getSellerOrders(sellerId, OrderStatus.COMPLETED, 1, 1),
        orderService.getSellerOrders(sellerId, OrderStatus.CANCELLED, 1, 1),
      ]);

      return ResponseHandler.success(res, 'Order statistics retrieved successfully', {
        stats: {
          pending: pendingOrders.total,
          processing: processingOrders.total,
          shipped: shippedOrders.total,
          completed: completedOrders.total,
          cancelled: cancelledOrders.total,
          total: pendingOrders.total + processingOrders.total + shippedOrders.total + 
                 completedOrders.total + cancelledOrders.total,
        },
      });
    }
  );

  /**
   * Get customer order statistics
   * GET /api/v1/orders/customer/stats
   */
  public getCustomerOrderStats = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const customerId = req.user!.id;

      const [
        pendingOrders,
        processingOrders,
        deliveredOrders,
        completedOrders,
        cancelledOrders,
      ] = await Promise.all([
        orderService.getCustomerOrders(customerId, OrderStatus.PENDING, 1, 1),
        orderService.getCustomerOrders(customerId, OrderStatus.PROCESSING, 1, 1),
        orderService.getCustomerOrders(customerId, OrderStatus.DELIVERED, 1, 1),
        orderService.getCustomerOrders(customerId, OrderStatus.COMPLETED, 1, 1),
        orderService.getCustomerOrders(customerId, OrderStatus.CANCELLED, 1, 1),
      ]);

      return ResponseHandler.success(res, 'Order statistics retrieved successfully', {
        stats: {
          pending: pendingOrders.total,
          processing: processingOrders.total,
          delivered: deliveredOrders.total,
          completed: completedOrders.total,
          cancelled: cancelledOrders.total,
          total: pendingOrders.total + processingOrders.total + deliveredOrders.total + 
                 completedOrders.total + cancelledOrders.total,
        },
      });
    }
  );
}

export default new OrderController();