import Product, { IProduct, ProductStatus } from '../models/Product';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';
import mongoose from 'mongoose';

class ProductService {
  /**
   * Create a new product (vendor or admin)
   */
  public async createProduct(
    sellerId: string,
    sellerType: 'vendor' | 'admin',
    productData: {
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
    }
  ): Promise<IProduct> {
    // Admin products are auto-approved
    const approvalStatus = sellerType === 'admin' ? 'approved' : 'pending';
    const status = sellerType === 'admin' ? ProductStatus.APPROVED : ProductStatus.PENDING;

    const product = await Product.create({
      ...productData,
      seller: sellerId,
      sellerType,
      approvalStatus,
      status,
      ...(sellerType === 'admin' && {
        approvedBy: sellerId,
        approvedAt: new Date(),
      }),
    });

    logger.info(`Product created: ${product._id} by ${sellerType} ${sellerId}`);

    return product;
  }

  /**
   * Get product by ID
   */
  public async getProductById(productId: string, incrementView: boolean = false): Promise<IProduct> {
    const product = await Product.findById(productId)
      .populate('seller', 'firstName lastName email avatar vendorProfile')
      .populate('category', 'name icon slug')
      .populate('subCategory', 'name icon slug');

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Increment view count
    if (incrementView) {
      product.views += 1;
      await product.save();
    }

    return product;
  }

  /**
   * Get all products with filters (for clients - only approved)
   */
  public async getProducts(
    filters?: {
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
    },
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Build query - only approved and active products
    const query: any = {
      approvalStatus: 'approved',
      status: { $nin: [ProductStatus.DISCONTINUED] },
      isActive: true,
    };

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.subCategory) {
      query.subCategory = filters.subCategory;
    }

    if (filters?.seller) {
      query.seller = filters.seller;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) {
        query.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        query.price.$lte = filters.maxPrice;
      }
    }

    if (filters?.condition) {
      query.condition = filters.condition;
    }

    if (filters?.brand) {
      query.brand = new RegExp(filters.brand, 'i');
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
      query.featuredUntil = { $gte: new Date() };
    }

    if (filters?.isSponsored !== undefined) {
      query.isSponsored = filters.isSponsored;
      query.sponsoredUntil = { $gte: new Date() };
    }

    if (filters?.search) {
      query.$text = { $search: filters.search };
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('seller', 'firstName lastName avatar vendorProfile')
        .populate('category', 'name icon slug')
        .populate('subCategory', 'name icon slug')
        .skip(skip)
        .limit(limit)
        .sort(sortOptions),
      Product.countDocuments(query),
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }


  // Add this method to ProductService class
/**
 * Get all products for admin (including pending, rejected, approved)
 */
public async getAllProductsForAdmin(
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
  const { skip } = parsePaginationParams(page, limit);

  // Admin sees all products except deleted ones
  const query: any = {
    isDeleted: { $ne: true },
  };

  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('seller', 'firstName lastName avatar vendorProfile')
      .populate('category', 'name icon slug')
      .populate('subCategory', 'name icon slug')
      .skip(skip)
      .limit(limit)
      .sort(sortOptions),
    Product.countDocuments(query),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}



  // Add this method to your ProductService class in product.service.ts

/**
 * Get admin statistics
 */
public async getAdminStats(): Promise<{
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  featuredProducts: number;
  sponsoredProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
}> {
  const [
    totalProducts,
    approvedProducts,
    pendingProducts,
    rejectedProducts,
    featuredProducts,
    sponsoredProducts,
    activeProducts,
    outOfStockProducts,
  ] = await Promise.all([
    // Total products (excluding deleted)
    Product.countDocuments({ isDeleted: { $ne: true } }),
    
    // Approved products
    Product.countDocuments({ 
      approvalStatus: 'approved',
      isDeleted: { $ne: true }
    }),
    
    // Pending products
    Product.countDocuments({ 
      approvalStatus: 'pending',
      isDeleted: { $ne: true }
    }),
    
    // Rejected products
    Product.countDocuments({ 
      approvalStatus: 'rejected',
      isDeleted: { $ne: true }
    }),
    
    // Featured products (active featured)
    Product.countDocuments({
      isFeatured: true,
      featuredUntil: { $gte: new Date() },
      approvalStatus: 'approved',
      isDeleted: { $ne: true }
    }),
    
    // Sponsored products (active sponsored)
    Product.countDocuments({
      isSponsored: true,
      sponsoredUntil: { $gte: new Date() },
      approvalStatus: 'approved',
      isDeleted: { $ne: true }
    }),
    
    // Active products
    Product.countDocuments({
      isActive: true,
      approvalStatus: 'approved',
      status: { $nin: [ProductStatus.DISCONTINUED] },
      isDeleted: { $ne: true }
    }),
    
    // Out of stock products
    Product.countDocuments({
      $or: [
        { stock: 0 },
        { stock: { $lte: 0 } },
        { status: ProductStatus.OUT_OF_STOCK }
      ],
      approvalStatus: 'approved',
      isDeleted: { $ne: true }
    }),
  ]);

  return {
    totalProducts,
    approvedProducts,
    pendingProducts,
    rejectedProducts,
    featuredProducts,
    sponsoredProducts,
    activeProducts,
    outOfStockProducts,
  };
}

  /**
   * Get seller's products (vendor or admin)
   */
  public async getSellerProducts(
    sellerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query = { seller: sellerId };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name icon slug')
        .populate('subCategory', 'name icon slug')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Product.countDocuments(query),
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending products (admin only)
   */
  public async getPendingProducts(
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    const query = { approvalStatus: 'pending' };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('seller', 'firstName lastName email avatar vendorProfile')
        .populate('category', 'name icon slug')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 }),
      Product.countDocuments(query),
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update product (seller only)
   */
 /**
 * Update product (seller only)
 */
public async updateProduct(
  productId: string,
  sellerId: string,
  updates: Partial<IProduct>
): Promise<IProduct> {
  const product = await Product.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Check ownership
  if (product.seller.toString() !== sellerId) {
    throw new ForbiddenError('You can only update your own products');
  }

  // Don't allow updating approval status
  delete updates.approvalStatus;
  delete updates.approvedBy;
  delete updates.approvedAt;
  delete updates.isFeatured;
  delete updates.isSponsored;

  Object.assign(product, updates);
  
  // Reset to pending status if product was previously approved
  if (product.approvalStatus === 'approved' || product.approvalStatus=="rejected") {
    product.approvalStatus = 'pending';
    product.status = ProductStatus.PENDING;
    product.approvedBy = undefined;
    product.approvedAt = undefined;
  }

  await product.save();

  logger.info(`Product updated: ${productId} - Status reset to pending for re-approval`);

  return product;
}

  /**
   * Approve product (admin only)
   */
  public async approveProduct(productId: string, adminId: string): Promise<IProduct> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.approvalStatus === 'approved') {
      throw new BadRequestError('Product is already approved');
    }

    product.approvalStatus = 'approved';
    product.status = ProductStatus.APPROVED;
    product.approvedBy = mongoose.Types.ObjectId.createFromHexString(adminId);
    product.approvedAt = new Date();
    product.rejectionReason = undefined;

    await product.save();

    logger.info(`Product approved: ${productId} by admin ${adminId}`);

    return product;
  }

  /**
   * Reject product (admin only)
   */
  public async rejectProduct(
    productId: string,
    adminId: string,
    reason: string
  ): Promise<IProduct> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    product.approvalStatus = 'rejected';
    product.status = ProductStatus.REJECTED;
    product.rejectionReason = reason;
    product.approvedBy = mongoose.Types.ObjectId.createFromHexString(adminId);

    await product.save();

    logger.info(`Product rejected: ${productId} by admin ${adminId}`);

    return product;
  }

  /**
   * Feature product (admin only)
   */
  public async featureProduct(
    productId: string,
    adminId: string,
    featuredUntil: Date
  ): Promise<IProduct> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.approvalStatus !== 'approved') {
      throw new BadRequestError('Only approved products can be featured');
    }

    product.isFeatured = true;
    product.featuredUntil = featuredUntil;
    product.featuredBy = mongoose.Types.ObjectId.createFromHexString(adminId);

    await product.save();

    logger.info(`Product featured: ${productId} until ${featuredUntil}`);

    return product;
  }

  /**
   * Sponsor product (admin only)
   */
  public async sponsorProduct(
    productId: string,
    adminId: string,
    sponsoredUntil: Date,
    amount: number
  ): Promise<IProduct> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.approvalStatus !== 'approved') {
      throw new BadRequestError('Only approved products can be sponsored');
    }

    product.isSponsored = true;
    product.sponsoredUntil = sponsoredUntil;
    product.sponsorshipAmount = amount;
    product.sponsoredBy = mongoose.Types.ObjectId.createFromHexString(adminId);

    await product.save();

    logger.info(`Product sponsored: ${productId} until ${sponsoredUntil}`);

    return product;
  }

  /**
   * Delete product (soft delete)
   */
  public async deleteProduct(productId: string, userId: string): Promise<void> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.deletedBy = mongoose.Types.ObjectId.createFromHexString(userId);
    product.isActive = false;

    await product.save();

    logger.info(`Product deleted: ${productId}`);
  }


  /**
 * Get sponsored products (for admin or public display)
 */
public async getSponsoredProducts(
  page: number = 1,
  limit: number = 20
): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
  const { skip } = parsePaginationParams(page, limit);

  const query = { 
    isSponsored: true,
    sponsoredUntil: { $gte: new Date() },
    approvalStatus: 'approved',
    isActive: true,
    isDeleted: { $ne: true }
  };

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('seller', 'firstName lastName avatar vendorProfile')
      .populate('category', 'name icon slug')
      .populate('subCategory', 'name icon slug')
      .skip(skip)
      .limit(limit)
      .sort({ sponsoredUntil: -1 }), // Most recently sponsored first
    Product.countDocuments(query),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get featured products (for admin or public display)
 */
public async getFeaturedProducts(
  page: number = 1,
  limit: number = 20
): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
  const { skip } = parsePaginationParams(page, limit);

  const query = { 
    isFeatured: true,
    featuredUntil: { $gte: new Date() },
    approvalStatus: 'approved',
    isActive: true,
    isDeleted: { $ne: true }
  };

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('seller', 'firstName lastName avatar vendorProfile')
      .populate('category', 'name icon slug')
      .populate('subCategory', 'name icon slug')
      .skip(skip)
      .limit(limit)
      .sort({ featuredUntil: -1 }),
    Product.countDocuments(query),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

  /**
   * Update stock
   */
  public async updateStock(productId: string, quantity: number): Promise<IProduct> {
    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    product.stock = quantity;
    await product.save();

    return product;
  }


  /**
 * Get rejected products (admin only)
 */
public async getRejectedProducts(
  page: number = 1,
  limit: number = 20
): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
  const { skip } = parsePaginationParams(page, limit);

  const query = { 
    approvalStatus: 'rejected',
    isDeleted: { $ne: true }
  };

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('seller', 'firstName lastName email avatar vendorProfile')
      .populate('category', 'name icon slug')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Product.countDocuments(query),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
}

export default new ProductService();