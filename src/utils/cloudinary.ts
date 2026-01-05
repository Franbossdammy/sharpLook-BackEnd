import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import config from '../config';
import logger from './logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

interface UploadOptions {
  folder?: string;
  transformation?: any;
  public_id?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto'; // ← UPDATED: Added resource_type
}

/**
 * Upload buffer to Cloudinary
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'sharplook',
        resource_type: options.resource_type || 'image', // ← UPDATED: Use provided resource_type
        transformation: options.transformation,
        public_id: options.public_id,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result!.secure_url);
        }
      }
    );

    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload multiple buffers to Cloudinary
 */
export const uploadMultipleToCloudinary = async (
  buffers: Buffer[],
  options: UploadOptions = {}
): Promise<string[]> => {
  const uploadPromises = buffers.map((buffer) =>
    uploadToCloudinary(buffer, options)
  );
  return Promise.all(uploadPromises);
};

/**
 * Delete image from Cloudinary
 */
export const deleteFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extract public_id from URL
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = parts[parts.length - 2];
    const fullPublicId = `${folder}/${publicId}`;

    await cloudinary.uploader.destroy(fullPublicId);
    logger.info(`Deleted image from Cloudinary: ${fullPublicId}`);
  } catch (error) {
    logger.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete multiple images from Cloudinary
 */
export const deleteMultipleFromCloudinary = async (
  imageUrls: string[]
): Promise<void> => {
  const deletePromises = imageUrls.map((url) => deleteFromCloudinary(url));
  await Promise.all(deletePromises);
};

export default cloudinary;