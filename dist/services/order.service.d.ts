import { IOrder, OrderStatus, DeliveryType } from '../models/Order';
import mongoose from 'mongoose';
import { UserRole } from '../types';
export interface PreparedOrderData {
    customerId: string;
    orderItems: Array<{
        product: string;
        name: string;
        price: number;
        quantity: number;
        selectedVariant?: {
            name: string;
            option: string;
        };
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
declare class OrderService {
    /**
     * Generate unique order number
     */
    private generateOrderNumber;
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    private calculateDistance;
    /**
     * Create a new order with distance-based delivery fee
     */
    createOrder(customerId: string, orderData: {
        items: Array<{
            product: string;
            quantity: number;
            selectedVariant?: {
                name: string;
                option: string;
            };
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
    }): Promise<IOrder>;
    /**
     * Calculate delivery fee preview (before order creation)
     */
    calculateDeliveryFeePreview(productId: string, customerLocation: {
        coordinates: [number, number];
    }): Promise<{
        distance: number;
        deliveryFee: number;
        estimatedDeliveryTime: string;
        canDeliver: boolean;
        message?: string;
    }>;
    /**
     * Validate order data and calculate fees without any database writes.
     * Call this before initiating payment to ensure everything is valid.
     */
    prepareOrderData(customerId: string, orderData: {
        items: Array<{
            product: string;
            quantity: number;
            selectedVariant?: {
                name: string;
                option: string;
            };
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
    }): Promise<PreparedOrderData>;
    /**
     * Create the order and decrement stock atomically.
     * Only call this after payment has been confirmed.
     */
    finalizeOrder(preparedData: PreparedOrderData, paymentReference: string, session?: mongoose.ClientSession): Promise<IOrder>;
    /**
     * Update order payment status (after payment confirmation)
     */
    confirmPayment(orderId: string, paymentId: string): Promise<IOrder>;
    /**
     * Get order by ID
     */
    getOrderById(orderId: string): Promise<IOrder>;
    /**
     * Get customer orders
     */
    getCustomerOrders(customerId: string, status?: OrderStatus, page?: number, limit?: number): Promise<{
        orders: IOrder[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get seller orders
     */
    getSellerOrders(sellerId: string, status?: OrderStatus, page?: number, limit?: number): Promise<{
        orders: IOrder[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Update order status (seller)
     */
    updateOrderStatus(orderId: string, sellerId: string, status: OrderStatus, note?: string): Promise<IOrder>;
    /**
     * Confirm delivery (customer or seller)
     */
    confirmDelivery(orderId: string, userId: string, role: 'customer' | 'seller'): Promise<IOrder>;
    /**
    * Cancel order
    */
    cancelOrder(orderId: string, userId: string, reason: string, userRole?: UserRole): Promise<IOrder>;
    deleteOrder(orderId: string): Promise<void>;
    /**
     * Process refund for cancelled order
     */
    private processOrderRefund;
    /**
     * Get all orders (admin)
     */
    getAllOrders(filters?: {
        status?: OrderStatus;
        seller?: string;
        customer?: string;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, limit?: number): Promise<{
        orders: IOrder[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Add tracking information (seller)
     */
    addTrackingInfo(orderId: string, sellerId: string, trackingNumber: string, courierService: string): Promise<IOrder>;
    /**
     * Release escrow funds to seller
     */
    private releaseFundsToSeller;
}
declare const _default: OrderService;
export default _default;
//# sourceMappingURL=order.service.d.ts.map