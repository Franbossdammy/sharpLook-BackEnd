import { IService } from '../models/Service';
import { IReview } from '../models/Review';
declare class ServiceService {
    createService(vendorId: string, data: {
        name: string;
        description: string;
        category: string;
        subCategory?: string;
        basePrice: number;
        priceType?: 'fixed' | 'hourly' | 'negotiable';
        duration?: number;
        images?: string[];
        tags?: string[];
        requirements?: string[];
        whatIsIncluded?: string[];
        faqs?: {
            question: string;
            answer: string;
        }[];
        availability?: any;
    }): Promise<IService>;
    /**
     * Get all services with filters
     */
    getAllServices(filters?: {
        vendor?: string;
        category?: string;
        subCategory?: string;
        priceMin?: number;
        priceMax?: number;
        rating?: number;
        search?: string;
        isActive?: boolean;
        approvalStatus?: 'pending' | 'approved' | 'rejected';
        location?: {
            latitude: number;
            longitude: number;
            maxDistance?: number;
        };
    }, page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        services: IService[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get service by ID
     */
    getServiceById(serviceId: string, incrementView?: boolean): Promise<IService>;
    /**
     * Get service by slug
     */
    getServiceBySlug(slug: string, incrementView?: boolean): Promise<IService>;
    /**
     * Update service
     */
    updateService(serviceId: string, vendorId: string, updates: Partial<IService>): Promise<IService>;
    /**
     * Delete service (soft delete)
     */
    deleteService(serviceId: string, vendorId: string): Promise<void>;
    /**
     * Toggle service active status
     */
    toggleServiceStatus(serviceId: string, vendorId: string): Promise<IService>;
    /**
     * Get vendor services
     */
    getVendorServices(vendorId: string, page?: number, limit?: number): Promise<{
        services: IService[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * ADMIN: Approve a service
     */
    approveService(serviceId: string, adminId: string, notes?: string): Promise<IService>;
    /**
     * ADMIN: Reject a service
     */
    rejectService(serviceId: string, adminId: string, reason: string): Promise<IService>;
    /**
     * Search vendors by business name, services, or category
     */
    searchVendors(query: string, page?: number, limit?: number): Promise<{
        vendors: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * ADMIN: Get all pending services for approval
     */
    getPendingServices(page?: number, limit?: number): Promise<{
        services: IService[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * ADMIN: Get service approval statistics
     */
    getApprovalStats(): Promise<{
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    }>;
    /**
     * Add review to service
     */
    addReview(serviceId: string, clientId: string, bookingId: string, data: {
        rating: number;
        comment?: string;
        images?: string[];
    }): Promise<IReview>;
    /**
     * Get service reviews
     */
    getServiceReviews(serviceId: string, page?: number, limit?: number): Promise<{
        reviews: IReview[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Respond to review (vendor)
     */
    respondToReview(reviewId: string, vendorId: string, responseText: string): Promise<IReview>;
    /**
     * Get trending services
     */
    getTrendingServices(limit?: number): Promise<IService[]>;
    /**
     * Get popular services by category
     */
    getPopularByCategory(categoryId: string, limit?: number): Promise<IService[]>;
}
declare const _default: ServiceService;
export default _default;
//# sourceMappingURL=service.service.d.ts.map