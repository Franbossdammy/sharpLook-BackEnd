import Category, { ICategory } from '../models/Category';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { slugify, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

class CategoryService {
  /**
   * Create a new category
   */
  public async createCategory(data: {
    name: string;
    description?: string;
    icon?: string;
    image?: string;
    parentCategory?: string;
    order?: number;
    metadata?: any;
  }): Promise<ICategory> {
    // Check if category with same name exists
    const existingCategory = await Category.findOne({ name: data.name });
    if (existingCategory) {
      throw new ConflictError('Category with this name already exists');
    }

    // Generate slug
    const slug = slugify(data.name);

    // Check if parent category exists
    if (data.parentCategory) {
      const parentExists = await Category.findById(data.parentCategory);
      if (!parentExists) {
        throw new NotFoundError('Parent category not found');
      }
    }

    const category = await Category.create({
      ...data,
      slug,
    });

    logger.info(`Category created: ${category.name}`);

    return category;
  }

  /**
   * Get all categories
   */
  public async getAllCategories(
    page: number = 1,
    limit: number = 50,
    filters?: {
      parentCategory?: string;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<{ categories: ICategory[]; total: number; page: number; totalPages: number }> {
    const { skip } = parsePaginationParams(page, limit);

    // Build query
    const query: any = {};

    if (filters?.parentCategory) {
      query.parentCategory = filters.parentCategory;
    } else if (filters?.parentCategory === null) {
      query.parentCategory = null; // Only root categories
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    const [categories, total] = await Promise.all([
      Category.find(query)
        .populate('parentCategory', 'name slug icon')
        .skip(skip)
        .limit(limit)
        .sort({ order: 1, name: 1 }),
      Category.countDocuments(query),
    ]);

    return {
      categories,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get category by ID
   */
  public async getCategoryById(categoryId: string): Promise<ICategory> {
    const category = await Category.findById(categoryId)
      .populate('parentCategory', 'name slug icon')
      .populate('subcategories');

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  /**
   * Get category by slug
   */
  public async getCategoryBySlug(slug: string): Promise<ICategory> {
    const category = await Category.findOne({ slug })
      .populate('parentCategory', 'name slug icon')
      .populate('subcategories');

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  /**
   * Update category
   */
  public async updateCategory(
    categoryId: string,
    updates: {
      name?: string;
      description?: string;
      icon?: string;
      image?: string;
      parentCategory?: string;
      isActive?: boolean;
      order?: number;
      metadata?: any;
    }
  ): Promise<ICategory> {
    const category = await Category.findById(categoryId);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check if name is being updated and if it's unique
    if (updates.name && updates.name !== category.name) {
      const existingCategory = await Category.findOne({ name: updates.name });
      if (existingCategory) {
        throw new ConflictError('Category with this name already exists');
      }
      // Update slug
      category.slug = slugify(updates.name);
    }

    // Check if parent category exists
    if (updates.parentCategory) {
      const parentExists = await Category.findById(updates.parentCategory);
      if (!parentExists) {
        throw new NotFoundError('Parent category not found');
      }

      // Prevent circular reference
      if (updates.parentCategory === categoryId) {
        throw new BadRequestError('Category cannot be its own parent');
      }
    }

    // Update fields
    Object.assign(category, updates);

    await category.save();

    logger.info(`Category updated: ${category.name}`);

    return category;
  }

  /**
   * Delete category (soft delete)
   */
  public async deleteCategory(categoryId: string): Promise<void> {
    const category = await Category.findById(categoryId);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check if category has subcategories
    const subcategories = await Category.find({ parentCategory: categoryId });
    if (subcategories.length > 0) {
      throw new BadRequestError(
        'Cannot delete category with subcategories. Please delete subcategories first.'
      );
    }

    // Check if category has services
    const Service = require('./Service').default;
    const servicesCount = await Service.countDocuments({ category: categoryId });
    if (servicesCount > 0) {
      throw new BadRequestError(
        'Cannot delete category with active services. Please reassign or delete services first.'
      );
    }

    category.isDeleted = true;
    category.deletedAt = new Date();
    await category.save();

    logger.info(`Category deleted: ${category.name}`);
  }

  /**
   * Restore deleted category
   */
  public async restoreCategory(categoryId: string): Promise<ICategory> {
    const category = await Category.findOne({ _id: categoryId, isDeleted: true });

    if (!category) {
      throw new NotFoundError('Deleted category not found');
    }

    category.isDeleted = false;
    category.deletedAt = undefined;
    await category.save();

    logger.info(`Category restored: ${category.name}`);

    return category;
  }

  /**
   * Get category tree (hierarchical)
   */
  public async getCategoryTree(): Promise<ICategory[]> {
    // Get all root categories (no parent)
    const rootCategories = await Category.find({ parentCategory: null, isActive: true })
      .sort({ order: 1, name: 1 })
      .populate('subcategories');

    return rootCategories;
  }

  /**
   * Reorder categories
   */
  public async reorderCategories(
    orders: { categoryId: string; order: number }[]
  ): Promise<void> {
    const updatePromises = orders.map(({ categoryId, order }) =>
      Category.findByIdAndUpdate(categoryId, { order })
    );

    await Promise.all(updatePromises);

    logger.info('Categories reordered');
  }
}

export default new CategoryService();
