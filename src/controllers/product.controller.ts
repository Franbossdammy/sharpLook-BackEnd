import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import productService from '../services/product.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

class ProductController {
  /**
   * Create a new product
   * POST /api/v1/products
   */
  public createProduct = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);
      
      // Handle multiple image uploads
      const files = req.files as Express.Multer.File[];
      const imageUrls: string[] = [];

      if (!files || files.length === 0) {
        throw new BadRequestError('At least one product image is required');
      }

      try {
        // Upload images to Cloudinary
        for (const file of files) {
          const imageUrl = await uploadToCloudinary(file.buffer, {
            folder: 'sharplook/products',
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });
          imageUrls.push(imageUrl);
        }

        const productData = {
          ...req.body,
          images: imageUrls,
        };

        // Parse arrays from form-data
        if (req.body.tags && typeof req.body.tags === 'string') {
          productData.tags = JSON.parse(req.body.tags);
        }

        if (req.body.variants && typeof req.body.variants === 'string') {
          productData.variants = JSON.parse(req.body.variants);
        }

        if (req.body.deliveryOptions && typeof req.body.deliveryOptions === 'string') {
          productData.deliveryOptions = JSON.parse(req.body.deliveryOptions);
        }

        if (req.body.location && typeof req.body.location === 'string') {
          productData.location = JSON.parse(req.body.location);
        }

        if (req.body.dimensions && typeof req.body.dimensions === 'string') {
          productData.dimensions = JSON.parse(req.body.dimensions);
        }

        if (req.body.discount && typeof req.body.discount === 'string') {
          productData.discount = JSON.parse(req.body.discount);
        }

        const sellerType = isAdmin ? 'admin' : 'vendor';
        const product = await productService.createProduct(userId, sellerType, productData);

        return ResponseHandler.success(
          res,
          isAdmin ? 'Product created and approved' : 'Product created successfully. Awaiting admin approval',
          { product },
          201
        );
      } catch (error) {
        // Clean up uploaded images if product creation fails
        for (const imageUrl of imageUrls) {
          try {
            await deleteFromCloudinary(imageUrl);
          } catch (err) {
            logger.warn(`Failed to delete image: ${imageUrl}`);
          }
        }
        throw error;
      }
    }
  );

  /**
   * Get all products (clients - only approved)
   * GET /api/v1/products
   */
  public getProducts = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const filters: any = {
        category: req.query.category as string,
        subCategory: req.query.subCategory as string,
        seller: req.query.seller as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        condition: req.query.condition as string,
        brand: req.query.brand as string,
        search: req.query.search as string,
        isFeatured: req.query.isFeatured === 'true' ? true : undefined,
        isSponsored: req.query.isSponsored === 'true' ? true : undefined,
      };

      if (req.query.tags) {
        filters.tags = (req.query.tags as string).split(',');
      }

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const result = await productService.getProducts(filters, page, limit, sortBy, sortOrder);

      return ResponseHandler.paginated(
        res,
        'Products retrieved successfully',
        result.products,
        page,
        limit,
        result.total
      );
    }
  );



/**
 * Get featured products
 * GET /api/v1/products/featured
 */
public getFeaturedProducts = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await productService.getFeaturedProducts(page, limit);

    return ResponseHandler.paginated(
      res,
      'Featured products retrieved successfully',
      result.products,
      page,
      limit,
      result.total
    );
  }
);

/**
 * Get sponsored products
 * GET /api/v1/products/sponsored
 */
public getSponsoredProducts = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await productService.getSponsoredProducts(page, limit);

    return ResponseHandler.paginated(
      res,
      'Sponsored products retrieved successfully',
      result.products,
      page,
      limit,
      result.total
    );
  }
);



/**
 * Get admin statistics
 * GET /api/v1/products/admin/stats
 */
public getAdminStats = asyncHandler(
  async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    const stats = await productService.getAdminStats();

    return ResponseHandler.success(res, 'Product statistics retrieved successfully', stats);
  }
);


// Add to ProductController class
/**
 * Get all products for admin
 * GET /api/v1/products/admin/all
 */
public getAllProductsForAdmin = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await productService.getAllProductsForAdmin(page, limit, sortBy, sortOrder);

    return ResponseHandler.paginated(
      res,
      'All products retrieved successfully',
      result.products,
      page,
      limit,
      result.total
    );
  }
);



/**
 * Get rejected products (admin only)
 * GET /api/v1/products/admin/rejected
 */
public getRejectedProducts = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await productService.getRejectedProducts(page, limit);

    return ResponseHandler.paginated(
      res,
      'Rejected products retrieved successfully',
      result.products,
      page,
      limit,
      result.total
    );
  }
);
  /**
   * Get product by ID
   * GET /api/v1/products/:productId
   */
  public getProductById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const incrementView = req.query.incrementView !== 'false';

      const product = await productService.getProductById(productId, incrementView);

      return ResponseHandler.success(res, 'Product retrieved successfully', {
        product,
      });
    }
  );

  /**
   * Get seller's products
   * GET /api/v1/products/seller/my-products
   */
  public getMyProducts = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await productService.getSellerProducts(userId, page, limit);

      return ResponseHandler.paginated(
        res,
        'Your products retrieved successfully',
        result.products,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get pending products (admin only)
   * GET /api/v1/products/admin/pending
   */
  public getPendingProducts = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await productService.getPendingProducts(page, limit);

      return ResponseHandler.paginated(
        res,
        'Pending products retrieved successfully',
        result.products,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Update product
   * PUT /api/v1/products/:productId
   */
  public updateProduct = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const userId = req.user!.id;

      // Handle image uploads if any
      const files = req.files as Express.Multer.File[];
      const updates = { ...req.body };

      if (files && files.length > 0) {
        const imageUrls: string[] = [];
        
        for (const file of files) {
          const imageUrl = await uploadToCloudinary(file.buffer, {
            folder: 'sharplook/products',
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });
          imageUrls.push(imageUrl);
        }

        // Append to existing images or replace
        if (req.body.replaceImages === 'true') {
          updates.images = imageUrls;
        } else {
          const currentProduct = await productService.getProductById(productId, false);
          updates.images = [...currentProduct.images, ...imageUrls];
        }
      }

      // Parse JSON strings from form-data
      if (req.body.tags && typeof req.body.tags === 'string') {
        updates.tags = JSON.parse(req.body.tags);
      }

      if (req.body.variants && typeof req.body.variants === 'string') {
        updates.variants = JSON.parse(req.body.variants);
      }

      if (req.body.deliveryOptions && typeof req.body.deliveryOptions === 'string') {
        updates.deliveryOptions = JSON.parse(req.body.deliveryOptions);
      }

      if (req.body.location && typeof req.body.location === 'string') {
        updates.location = JSON.parse(req.body.location);
      }

      if (req.body.dimensions && typeof req.body.dimensions === 'string') {
        updates.dimensions = JSON.parse(req.body.dimensions);
      }

      if (req.body.discount && typeof req.body.discount === 'string') {
        updates.discount = JSON.parse(req.body.discount);
      }

      const product = await productService.updateProduct(productId, userId, updates);

      return ResponseHandler.success(res, 'Product updated successfully', {
        product,
      });
    }
  );

  /**
   * Delete product
   * DELETE /api/v1/products/:productId
   */
  public deleteProduct = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const userId = req.user!.id;

      await productService.deleteProduct(productId, userId);

      return ResponseHandler.success(res, 'Product deleted successfully');
    }
  );

  /**
   * Approve product (admin only)
   * POST /api/v1/products/:productId/approve
   */
  public approveProduct = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const adminId = req.user!.id;

      const product = await productService.approveProduct(productId, adminId);

      return ResponseHandler.success(res, 'Product approved successfully', {
        product,
      });
    }
  );

  /**
   * Reject product (admin only)
   * POST /api/v1/products/:productId/reject
   */
  public rejectProduct = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const adminId = req.user!.id;
      const { reason } = req.body;

      const product = await productService.rejectProduct(productId, adminId, reason);

      return ResponseHandler.success(res, 'Product rejected', {
        product,
      });
    }
  );

  /**
   * Feature product (admin only)
   * POST /api/v1/products/:productId/feature
   */
  public featureProduct = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const adminId = req.user!.id;
      const { featuredUntil } = req.body;

      const product = await productService.featureProduct(
        productId,
        adminId,
        new Date(featuredUntil)
      );

      return ResponseHandler.success(res, 'Product featured successfully', {
        product,
      });
    }
  );

  /**
   * Sponsor product (admin only)
   * POST /api/v1/products/:productId/sponsor
   */
  public sponsorProduct = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const adminId = req.user!.id;
      const { sponsoredUntil, amount } = req.body;

      const product = await productService.sponsorProduct(
        productId,
        adminId,
        new Date(sponsoredUntil),
        amount
      );

      return ResponseHandler.success(res, 'Product sponsored successfully', {
        product,
      });
    }
  );

  /**
   * Update stock
   * PATCH /api/v1/products/:productId/stock
   */
  public updateStock = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { productId } = req.params;
      const { quantity } = req.body;

      const product = await productService.updateStock(productId, quantity);

      return ResponseHandler.success(res, 'Stock updated successfully', {
        product: {
          id: product._id,
          name: product.name,
          stock: product.stock,
          status: product.status,
        },
      });
    }
  );

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
}

export default new ProductController();