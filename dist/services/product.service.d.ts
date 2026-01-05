import { IProduct } from '../models/Product';
declare class ProductService {
    /**
     * Create a new product (vendor or admin)
     */
    createProduct(sellerId: string, sellerType: 'vendor' | 'admin', productData: {
        name: string;
        description: string;
        shortDescription?: string;
        category: string;
        subCategory?: string;
        tags?: string[];
        price: number;
        compareAtPrice?: number;
        costPrice?: number;
        stock: number;
        lowStockThreshold?: number;
        sku?: string;
        barcode?: string;
        images: string[];
        condition?: string;
        brand?: string;
        weight?: number;
        dimensions?: any;
        variants?: any[];
        deliveryOptions: {
            homeDelivery: boolean;
            pickup: boolean;
            freeDelivery?: boolean;
            deliveryFee?: number;
            estimatedDeliveryDays?: number;
        };
        location?: any;
    }): Promise<IProduct>;
    /**
     * Get product by ID
     */
    getProductById(productId: string, incrementView?: boolean): Promise<IProduct>;
    /**
     * Get all products with filters (for clients - only approved)
     */
    getProducts(filters?: {
        category?: string;
        subCategory?: string;
        seller?: string;
        minPrice?: number;
        maxPrice?: number;
        condition?: string;
        brand?: string;
        tags?: string[];
        search?: string;
        isFeatured?: boolean;
        isSponsored?: boolean;
    }, page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        products: IProduct[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get all products for admin (including pending, rejected, approved)
     */
    getAllProductsForAdmin(page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        products: IProduct[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get admin statistics
     */
    getAdminStats(): Promise<{
        totalProducts: number;
        approvedProducts: number;
        pendingProducts: number;
        rejectedProducts: number;
        featuredProducts: number;
        sponsoredProducts: number;
        activeProducts: number;
        outOfStockProducts: number;
    }>;
    /**
     * Get seller's products (vendor or admin)
     */
    getSellerProducts(sellerId: string, page?: number, limit?: number): Promise<{
        products: IProduct[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get pending products (admin only)
     */
    getPendingProducts(page?: number, limit?: number): Promise<{
        products: IProduct[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Update product (seller only)
     */
    /**
    * Update product (seller only)
    */
    updateProduct(productId: string, sellerId: string, updates: Partial<IProduct>): Promise<IProduct>;
    /**
     * Approve product (admin only)
     */
    approveProduct(productId: string, adminId: string): Promise<IProduct>;
    /**
     * Reject product (admin only)
     */
    rejectProduct(productId: string, adminId: string, reason: string): Promise<IProduct>;
    /**
     * Feature product (admin only)
     */
    featureProduct(productId: string, adminId: string, featuredUntil: Date): Promise<IProduct>;
    /**
     * Sponsor product (admin only)
     */
    sponsorProduct(productId: string, adminId: string, sponsoredUntil: Date, amount: number): Promise<IProduct>;
    /**
     * Delete product (soft delete)
     */
    deleteProduct(productId: string, userId: string): Promise<void>;
    /**
   * Get sponsored products (for admin or public display)
   */
    getSponsoredProducts(page?: number, limit?: number): Promise<{
        products: IProduct[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get featured products (for admin or public display)
     */
    getFeaturedProducts(page?: number, limit?: number): Promise<{
        products: IProduct[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Update stock
     */
    updateStock(productId: string, quantity: number): Promise<IProduct>;
    /**
   * Get rejected products (admin only)
   */
    getRejectedProducts(page?: number, limit?: number): Promise<{
        products: IProduct[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
declare const _default: ProductService;
export default _default;
//# sourceMappingURL=product.service.d.ts.map