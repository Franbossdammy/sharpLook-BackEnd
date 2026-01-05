import { Response, NextFunction } from 'express';
declare class CategoryController {
    /**
     * Create category (Admin)
     * POST /api/v1/categories
     */
    createCategory: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get all categories
     * GET /api/v1/categories
     */
    getAllCategories: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get category tree
     * GET /api/v1/categories/tree
     */
    getCategoryTree: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get category by ID
     * GET /api/v1/categories/:categoryId
     */
    getCategoryById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Get category by slug
     * GET /api/v1/categories/slug/:slug
     */
    getCategoryBySlug: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Update category (Admin)
     * PUT /api/v1/categories/:categoryId
     */
    updateCategory: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Delete category (Admin)
     * DELETE /api/v1/categories/:categoryId
     */
    deleteCategory: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Restore category (Admin)
     * POST /api/v1/categories/:categoryId/restore
     */
    restoreCategory: (req: import("express").Request, res: Response, next: NextFunction) => void;
    /**
     * Reorder categories (Admin)
     * PUT /api/v1/categories/reorder
     */
    reorderCategories: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare const _default: CategoryController;
export default _default;
//# sourceMappingURL=category.controller.d.ts.map