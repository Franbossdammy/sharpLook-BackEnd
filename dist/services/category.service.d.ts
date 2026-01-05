import { ICategory } from '../models/Category';
declare class CategoryService {
    /**
     * Create a new category
     */
    createCategory(data: {
        name: string;
        description?: string;
        icon?: string;
        image?: string;
        parentCategory?: string;
        order?: number;
        metadata?: any;
    }): Promise<ICategory>;
    /**
     * Get all categories
     */
    getAllCategories(page?: number, limit?: number, filters?: {
        parentCategory?: string;
        isActive?: boolean;
        search?: string;
    }): Promise<{
        categories: ICategory[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get category by ID
     */
    getCategoryById(categoryId: string): Promise<ICategory>;
    /**
     * Get category by slug
     */
    getCategoryBySlug(slug: string): Promise<ICategory>;
    /**
     * Update category
     */
    updateCategory(categoryId: string, updates: {
        name?: string;
        description?: string;
        icon?: string;
        image?: string;
        parentCategory?: string;
        isActive?: boolean;
        order?: number;
        metadata?: any;
    }): Promise<ICategory>;
    /**
     * Delete category (soft delete)
     */
    deleteCategory(categoryId: string): Promise<void>;
    /**
     * Restore deleted category
     */
    restoreCategory(categoryId: string): Promise<ICategory>;
    /**
     * Get category tree (hierarchical)
     */
    getCategoryTree(): Promise<ICategory[]>;
    /**
     * Reorder categories
     */
    reorderCategories(orders: {
        categoryId: string;
        order: number;
    }[]): Promise<void>;
}
declare const _default: CategoryService;
export default _default;
//# sourceMappingURL=category.service.d.ts.map