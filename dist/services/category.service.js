"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Category_1 = __importDefault(require("../models/Category"));
const errors_1 = require("../utils/errors");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class CategoryService {
    /**
     * Create a new category
     */
    async createCategory(data) {
        // Check if category with same name exists
        const existingCategory = await Category_1.default.findOne({ name: data.name });
        if (existingCategory) {
            throw new errors_1.ConflictError('Category with this name already exists');
        }
        // Generate slug
        const slug = (0, helpers_1.slugify)(data.name);
        // Check if parent category exists
        if (data.parentCategory) {
            const parentExists = await Category_1.default.findById(data.parentCategory);
            if (!parentExists) {
                throw new errors_1.NotFoundError('Parent category not found');
            }
        }
        const category = await Category_1.default.create({
            ...data,
            slug,
        });
        logger_1.default.info(`Category created: ${category.name}`);
        return category;
    }
    /**
     * Get all categories
     */
    async getAllCategories(page = 1, limit = 50, filters) {
        const { skip } = (0, helpers_1.parsePaginationParams)(page, limit);
        // Build query
        const query = {};
        if (filters?.parentCategory) {
            query.parentCategory = filters.parentCategory;
        }
        else if (filters?.parentCategory === null) {
            query.parentCategory = null; // Only root categories
        }
        if (filters?.isActive !== undefined) {
            query.isActive = filters.isActive;
        }
        if (filters?.search) {
            query.name = { $regex: filters.search, $options: 'i' };
        }
        const [categories, total] = await Promise.all([
            Category_1.default.find(query)
                .populate('parentCategory', 'name slug icon')
                .skip(skip)
                .limit(limit)
                .sort({ order: 1, name: 1 }),
            Category_1.default.countDocuments(query),
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
    async getCategoryById(categoryId) {
        const category = await Category_1.default.findById(categoryId)
            .populate('parentCategory', 'name slug icon')
            .populate('subcategories');
        if (!category) {
            throw new errors_1.NotFoundError('Category not found');
        }
        return category;
    }
    /**
     * Get category by slug
     */
    async getCategoryBySlug(slug) {
        const category = await Category_1.default.findOne({ slug })
            .populate('parentCategory', 'name slug icon')
            .populate('subcategories');
        if (!category) {
            throw new errors_1.NotFoundError('Category not found');
        }
        return category;
    }
    /**
     * Update category
     */
    async updateCategory(categoryId, updates) {
        const category = await Category_1.default.findById(categoryId);
        if (!category) {
            throw new errors_1.NotFoundError('Category not found');
        }
        // Check if name is being updated and if it's unique
        if (updates.name && updates.name !== category.name) {
            const existingCategory = await Category_1.default.findOne({ name: updates.name });
            if (existingCategory) {
                throw new errors_1.ConflictError('Category with this name already exists');
            }
            // Update slug
            category.slug = (0, helpers_1.slugify)(updates.name);
        }
        // Check if parent category exists
        if (updates.parentCategory) {
            const parentExists = await Category_1.default.findById(updates.parentCategory);
            if (!parentExists) {
                throw new errors_1.NotFoundError('Parent category not found');
            }
            // Prevent circular reference
            if (updates.parentCategory === categoryId) {
                throw new errors_1.BadRequestError('Category cannot be its own parent');
            }
        }
        // Update fields
        Object.assign(category, updates);
        await category.save();
        logger_1.default.info(`Category updated: ${category.name}`);
        return category;
    }
    /**
     * Delete category (soft delete)
     */
    async deleteCategory(categoryId) {
        const category = await Category_1.default.findById(categoryId);
        if (!category) {
            throw new errors_1.NotFoundError('Category not found');
        }
        // Check if category has subcategories
        const subcategories = await Category_1.default.find({ parentCategory: categoryId });
        if (subcategories.length > 0) {
            throw new errors_1.BadRequestError('Cannot delete category with subcategories. Please delete subcategories first.');
        }
        // Check if category has services
        const Service = require('./Service').default;
        const servicesCount = await Service.countDocuments({ category: categoryId });
        if (servicesCount > 0) {
            throw new errors_1.BadRequestError('Cannot delete category with active services. Please reassign or delete services first.');
        }
        category.isDeleted = true;
        category.deletedAt = new Date();
        await category.save();
        logger_1.default.info(`Category deleted: ${category.name}`);
    }
    /**
     * Restore deleted category
     */
    async restoreCategory(categoryId) {
        const category = await Category_1.default.findOne({ _id: categoryId, isDeleted: true });
        if (!category) {
            throw new errors_1.NotFoundError('Deleted category not found');
        }
        category.isDeleted = false;
        category.deletedAt = undefined;
        await category.save();
        logger_1.default.info(`Category restored: ${category.name}`);
        return category;
    }
    /**
     * Get category tree (hierarchical)
     */
    async getCategoryTree() {
        // Get all root categories (no parent)
        const rootCategories = await Category_1.default.find({ parentCategory: null, isActive: true })
            .sort({ order: 1, name: 1 })
            .populate('subcategories');
        return rootCategories;
    }
    /**
     * Reorder categories
     */
    async reorderCategories(orders) {
        const updatePromises = orders.map(({ categoryId, order }) => Category_1.default.findByIdAndUpdate(categoryId, { order }));
        await Promise.all(updatePromises);
        logger_1.default.info('Categories reordered');
    }
}
exports.default = new CategoryService();
//# sourceMappingURL=category.service.js.map