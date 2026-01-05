import { Router } from 'express';
import categoryController from '../controllers/category.controller';
import { authenticate, requireAdmin, optionalAuth } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation,
  categorySlugValidation,
  getCategoriesValidation,
  reorderCategoriesValidation,
} from '../validations/category.validation';

const router = Router();

/**
 * @route   GET /api/v1/categories/tree
 * @desc    Get category tree (hierarchical)
 * @access  Public
 */
router.get('/tree', optionalAuth, categoryController.getCategoryTree);

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get(
  '/',
  optionalAuth,
  validatePagination,
  validate(getCategoriesValidation),
  categoryController.getAllCategories
);

/**
 * @route   GET /api/v1/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get(
  '/slug/:slug',
  optionalAuth,
  validate(categorySlugValidation),
  categoryController.getCategoryBySlug
);

/**
 * @route   GET /api/v1/categories/:categoryId
 * @desc    Get category by ID
 * @access  Public
 */
router.get(
  '/:categoryId',
  optionalAuth,
  validate(categoryIdValidation),
  categoryController.getCategoryById
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/v1/categories
 * @desc    Create category (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createCategoryValidation),
  categoryController.createCategory
);

/**
 * @route   PUT /api/v1/categories/reorder
 * @desc    Reorder categories (Admin)
 * @access  Private (Admin)
 */
router.put(
  '/reorder',
  authenticate,
  requireAdmin,
  validate(reorderCategoriesValidation),
  categoryController.reorderCategories
);

/**
 * @route   PUT /api/v1/categories/:categoryId
 * @desc    Update category (Admin)
 * @access  Private (Admin)
 */
router.put(
  '/:categoryId',
  authenticate,
  requireAdmin,
  validate([...categoryIdValidation, ...updateCategoryValidation]),
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/v1/categories/:categoryId
 * @desc    Delete category (Admin)
 * @access  Private (Admin)
 */
router.delete(
  '/:categoryId',
  authenticate,
  requireAdmin,
  validate(categoryIdValidation),
  categoryController.deleteCategory
);

/**
 * @route   POST /api/v1/categories/:categoryId/restore
 * @desc    Restore deleted category (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/:categoryId/restore',
  authenticate,
  requireAdmin,
  validate(categoryIdValidation),
  categoryController.restoreCategory
);

export default router;
