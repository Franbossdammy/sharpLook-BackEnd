import { IUser } from '../models/User';
import { VendorType } from '../types';
interface UpdateVendorProfileData {
    businessName?: string;
    businessDescription?: string;
    vendorType?: VendorType;
    categories?: string[];
    location?: {
        type: 'Point';
        coordinates: [number, number];
        address: string;
        city: string;
        state: string;
        country: string;
    };
    serviceRadius?: number;
    availabilitySchedule?: {
        monday?: {
            isAvailable: boolean;
            from?: string;
            to?: string;
        };
        tuesday?: {
            isAvailable: boolean;
            from?: string;
            to?: string;
        };
        wednesday?: {
            isAvailable: boolean;
            from?: string;
            to?: string;
        };
        thursday?: {
            isAvailable: boolean;
            from?: string;
            to?: string;
        };
        friday?: {
            isAvailable: boolean;
            from?: string;
            to?: string;
        };
        saturday?: {
            isAvailable: boolean;
            from?: string;
            to?: string;
        };
        sunday?: {
            isAvailable: boolean;
            from?: string;
            to?: string;
        };
    };
    documents?: {
        idCard?: string;
        businessLicense?: string;
        certification?: string[];
    };
}
declare class VendorService {
    /**
     * Update vendor profile
     */
    updateVendorProfile(userId: string, updateData: UpdateVendorProfileData): Promise<IUser>;
    /**
     * Get vendor profile
     */
    getVendorProfile(userId: string): Promise<IUser>;
    /**
     * Update vendor availability schedule
     */
    updateAvailabilitySchedule(userId: string, schedule: UpdateVendorProfileData['availabilitySchedule']): Promise<IUser>;
    /**
     * Upload vendor document
     */
    uploadDocument(userId: string, documentType: 'idCard' | 'businessLicense' | 'certification', documentUrl: string): Promise<IUser>;
    /**
     * Update vendor location
     */
    updateLocation(userId: string, location: {
        type: 'Point';
        coordinates: [number, number];
        address: string;
        city: string;
        state: string;
        country: string;
    }, serviceRadius?: number): Promise<IUser>;
    /**
     * Check if vendor profile is complete
     */
    checkProfileCompletion(userId: string): Promise<{
        isComplete: boolean;
        percentage: number;
        missingFields: string[];
    }>;
}
declare const _default: VendorService;
export default _default;
//# sourceMappingURL=vendor.service.d.ts.map