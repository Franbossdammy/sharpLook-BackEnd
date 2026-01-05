"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const category_service_1 = __importDefault(require("../services/category.service"));
const response_1 = __importDefault(require("../utils/response"));
const error_1 = require("../middlewares/error");
class CategoryController {
    constructor() {
        /**
         * Create category (Admin)
         * POST /api/v1/categories
         */
        this.createCategory = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const category = await category_service_1.default.createCategory(req.body);
            return response_1.default.created(res, 'Category created successfully', {
                category,
            });
        });
        /**
         * Get all categories
         * GET /api/v1/categories
         */
        this.getAllCategories = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const filters = {
                parentCategory: req.query.parentCategory,
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                search: req.query.search,
            };
            const result = await category_service_1.default.getAllCategories(page, limit, filters);
            return response_1.default.paginated(res, 'Categories retrieved successfully', result.categories, page, limit, result.total);
        });
        /**
         * Get category tree
         * GET /api/v1/categories/tree
         */
        this.getCategoryTree = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            const categories = await category_service_1.default.getCategoryTree();
            return response_1.default.success(res, 'Category tree retrieved successfully', {
                categories,
            });
        });
        /**
         * Get category by ID
         * GET /api/v1/categories/:categoryId
         */
        this.getCategoryById = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { categoryId } = req.params;
            const category = await category_service_1.default.getCategoryById(categoryId);
            return response_1.default.success(res, 'Category retrieved successfully', {
                category,
            });
        });
        /**
         * Get category by slug
         * GET /api/v1/categories/slug/:slug
         */
        this.getCategoryBySlug = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { slug } = req.params;
            const category = await category_service_1.default.getCategoryBySlug(slug);
            return response_1.default.success(res, 'Category retrieved successfully', {
                category,
            });
        });
        /**
         * Update category (Admin)
         * PUT /api/v1/categories/:categoryId
         */
        this.updateCategory = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { categoryId } = req.params;
            const category = await category_service_1.default.updateCategory(categoryId, req.body);
            return response_1.default.success(res, 'Category updated successfully', {
                category,
            });
        });
        /**
         * Delete category (Admin)
         * DELETE /api/v1/categories/:categoryId
         */
        this.deleteCategory = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { categoryId } = req.params;
            await category_service_1.default.deleteCategory(categoryId);
            return response_1.default.success(res, 'Category deleted successfully');
        });
        /**
         * Restore category (Admin)
         * POST /api/v1/categories/:categoryId/restore
         */
        this.restoreCategory = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { categoryId } = req.params;
            const category = await category_service_1.default.restoreCategory(categoryId);
            return response_1.default.success(res, 'Category restored successfully', {
                category,
            });
        });
        /**
         * Reorder categories (Admin)
         * PUT /api/v1/categories/reorder
         */
        this.reorderCategories = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { orders } = req.body;
            await category_service_1.default.reorderCategories(orders);
            return response_1.default.success(res, 'Categories reordered successfully');
        });
    }
}
exports.default = new CategoryController();
//# sourceMappingURL=category.controller.js.map