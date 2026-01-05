"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = __importDefault(require("../controllers/category.controller"));
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const category_validation_1 = require("../validations/category.validation");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/categories/tree
 * @desc    Get category tree (hierarchical)
 * @access  Public
 */
router.get('/tree', auth_1.optionalAuth, category_controller_1.default.getCategoryTree);
/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', auth_1.optionalAuth, validate_1.validatePagination, (0, validate_1.validate)(category_validation_1.getCategoriesValidation), category_controller_1.default.getAllCategories);
/**
 * @route   GET /api/v1/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get('/slug/:slug', auth_1.optionalAuth, (0, validate_1.validate)(category_validation_1.categorySlugValidation), category_controller_1.default.getCategoryBySlug);
/**
 * @route   GET /api/v1/categories/:categoryId
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:categoryId', auth_1.optionalAuth, (0, validate_1.validate)(category_validation_1.categoryIdValidation), category_controller_1.default.getCategoryById);
// ==================== ADMIN ROUTES ====================
/**
 * @route   POST /api/v1/categories
 * @desc    Create category (Admin)
 * @access  Private (Admin)
 */
router.post('/', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(category_validation_1.createCategoryValidation), category_controller_1.default.createCategory);
/**
 * @route   PUT /api/v1/categories/reorder
 * @desc    Reorder categories (Admin)
 * @access  Private (Admin)
 */
router.put('/reorder', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(category_validation_1.reorderCategoriesValidation), category_controller_1.default.reorderCategories);
/**
 * @route   PUT /api/v1/categories/:categoryId
 * @desc    Update category (Admin)
 * @access  Private (Admin)
 */
router.put('/:categoryId', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)([...category_validation_1.categoryIdValidation, ...category_validation_1.updateCategoryValidation]), category_controller_1.default.updateCategory);
/**
 * @route   DELETE /api/v1/categories/:categoryId
 * @desc    Delete category (Admin)
 * @access  Private (Admin)
 */
router.delete('/:categoryId', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(category_validation_1.categoryIdValidation), category_controller_1.default.deleteCategory);
/**
 * @route   POST /api/v1/categories/:categoryId/restore
 * @desc    Restore deleted category (Admin)
 * @access  Private (Admin)
 */
router.post('/:categoryId/restore', auth_1.authenticate, auth_1.requireAdmin, (0, validate_1.validate)(category_validation_1.categoryIdValidation), category_controller_1.default.restoreCategory);
exports.default = router;
//# sourceMappingURL=category.routes.js.map