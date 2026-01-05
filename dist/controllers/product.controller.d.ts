import { Response, NextFunction } from 'express';
declare class ProductController {
    /**
     * Create a new product
     * POST /api/v1/products
     */
    createProduct: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all products (clients - only approved)
     * GET /api/v1/products
     */
    getProducts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get featured products
     * GET /api/v1/products/featured
     */
    getFeaturedProducts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get sponsored products
     * GET /api/v1/products/sponsored
     */
    getSponsoredProducts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get admin statistics
     * GET /api/v1/products/admin/stats
     */
    getAdminStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all products for admin
     * GET /api/v1/products/admin/all
     */
    getAllProductsForAdmin: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get rejected products (admin only)
     * GET /api/v1/products/admin/rejected
     */
    getRejectedProducts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get product by ID
     * GET /api/v1/products/:productId
     */
    getProductById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get seller's products
     * GET /api/v1/products/seller/my-products
     */
    getMyProducts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get pending products (admin only)
     * GET /api/v1/products/admin/pending
     */
    getPendingProducts: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update product
     * PUT /api/v1/products/:productId
     */
    updateProduct: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete product
     * DELETE /api/v1/products/:productId
     */
    deleteProduct: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Approve product (admin only)
     * POST /api/v1/products/:productId/approve
     */
    approveProduct: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Reject product (admin only)
     * POST /api/v1/products/:productId/reject
     */
    rejectProduct: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Feature product (admin only)
     * POST /api/v1/products/:productId/feature
     */
    featureProduct: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Sponsor product (admin only)
     * POST /api/v1/products/:productId/sponsor
     */
    sponsorProduct: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update stock
     * PATCH /api/v1/products/:productId/stock
     */
    updateStock: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: ProductController;
export default _default;
//# sourceMappingURL=product.controller.d.ts.map