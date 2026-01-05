import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import categoryService from '../services/category.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';

class CategoryController {
  /**
   * Create category (Admin)
   * POST /api/v1/categories
   */
  public createCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const category = await categoryService.createCategory(req.body);

      return ResponseHandler.created(res, 'Category created successfully', {
        category,
      });
    }
  );

  /**
   * Get all categories
   * GET /api/v1/categories
   */
  public getAllCategories = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = {
        parentCategory: req.query.parentCategory as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string,
      };

      const result = await categoryService.getAllCategories(page, limit, filters);

      return ResponseHandler.paginated(
        res,
        'Categories retrieved successfully',
        result.categories,
        page,
        limit,
        result.total
      );
    }
  );

  /**
   * Get category tree
   * GET /api/v1/categories/tree
   */
  public getCategoryTree = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
      const categories = await categoryService.getCategoryTree();

      return ResponseHandler.success(res, 'Category tree retrieved successfully', {
        categories,
      });
    }
  );

  /**
   * Get category by ID
   * GET /api/v1/categories/:categoryId
   */
  public getCategoryById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { categoryId } = req.params;

      const category = await categoryService.getCategoryById(categoryId);

      return ResponseHandler.success(res, 'Category retrieved successfully', {
        category,
      });
    }
  );

  /**
   * Get category by slug
   * GET /api/v1/categories/slug/:slug
   */
  public getCategoryBySlug = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { slug } = req.params;

      const category = await categoryService.getCategoryBySlug(slug);

      return ResponseHandler.success(res, 'Category retrieved successfully', {
        category,
      });
    }
  );

  /**
   * Update category (Admin)
   * PUT /api/v1/categories/:categoryId
   */
  public updateCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { categoryId } = req.params;

      const category = await categoryService.updateCategory(categoryId, req.body);

      return ResponseHandler.success(res, 'Category updated successfully', {
        category,
      });
    }
  );

  /**
   * Delete category (Admin)
   * DELETE /api/v1/categories/:categoryId
   */
  public deleteCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { categoryId } = req.params;

      await categoryService.deleteCategory(categoryId);

      return ResponseHandler.success(res, 'Category deleted successfully');
    }
  );

  /**
   * Restore category (Admin)
   * POST /api/v1/categories/:categoryId/restore
   */
  public restoreCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { categoryId } = req.params;

      const category = await categoryService.restoreCategory(categoryId);

      return ResponseHandler.success(res, 'Category restored successfully', {
        category,
      });
    }
  );

  /**
   * Reorder categories (Admin)
   * PUT /api/v1/categories/reorder
   */
  public reorderCategories = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const { orders } = req.body;

      await categoryService.reorderCategories(orders);

      return ResponseHandler.success(res, 'Categories reordered successfully');
    }
  );
}

export default new CategoryController();
