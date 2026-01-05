import { Response, NextFunction } from 'express';
declare class OrderController {
    /**
     * Calculate delivery fee preview
     * GET /api/v1/orders/delivery-fee-preview
     */
    calculateDeliveryFee: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Create a new order
     * POST /api/v1/orders
     */
    createOrder: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Confirm payment (called after payment gateway webhook)
     * POST /api/v1/orders/:orderId/confirm-payment
     */
    confirmPayment: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get order by ID
     * GET /api/v1/orders/:orderId
     */
    getOrderById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get customer's orders
     * GET /api/v1/orders/customer/my-orders
     */
    getMyOrders: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get seller's orders
     * GET /api/v1/orders/seller/my-orders
     */
    getMySellerOrders: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all orders (admin)
     * GET /api/v1/orders
     */
    getAllOrders: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update order status (seller)
     * PATCH /api/v1/orders/:orderId/status
     */
    updateOrderStatus: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Confirm delivery (customer or seller)
     * POST /api/v1/orders/:orderId/confirm-delivery
     */
    confirmDelivery: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Cancel order
     * POST /api/v1/orders/:orderId/cancel
     */
    cancelOrder: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Add tracking information (seller)
     * POST /api/v1/orders/:orderId/tracking
     */
    addTrackingInfo: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get order statistics (seller)
     * GET /api/v1/orders/seller/stats
     */
    getSellerOrderStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get customer order statistics
     * GET /api/v1/orders/customer/stats
     */
    getCustomerOrderStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: OrderController;
export default _default;
//# sourceMappingURL=order.controller.d.ts.map