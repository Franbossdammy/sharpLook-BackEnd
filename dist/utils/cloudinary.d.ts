import { v2 as cloudinary } from 'cloudinary';
interface UploadOptions {
    folder?: string;
    transformation?: any;
    public_id?: string;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
}
/**
 * Upload buffer to Cloudinary
 */
export declare const uploadToCloudinary: (buffer: Buffer, options?: UploadOptions) => Promise<string>;
/**
 * Upload multiple buffers to Cloudinary
 */
export declare const uploadMultipleToCloudinary: (buffers: Buffer[], options?: UploadOptions) => Promise<string[]>;
/**
 * Delete image from Cloudinary
 */
export declare const deleteFromCloudinary: (imageUrl: string) => Promise<void>;
/**
 * Delete multiple images from Cloudinary
 */
export declare const deleteMultipleFromCloudinary: (imageUrls: string[]) => Promise<void>;
export default cloudinary;
//# sourceMappingURL=cloudinary.d.ts.map