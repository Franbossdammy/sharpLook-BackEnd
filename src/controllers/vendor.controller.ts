// vendor.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import vendorService from '../services/vendor.service';
import ResponseHandler from '../utils/response';
import { asyncHandler } from '../middlewares/error';
import { uploadToCloudinary } from '../utils/cloudinary';
import { BadRequestError } from '../utils/errors';
import fs from 'fs'; // ✅ ADD THIS LINE

class VendorController {
  /**
   * Get vendor profile
   * GET /api/v1/vendors/profile
   */
  public getProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const vendor = await vendorService.getVendorProfile(userId);

      // Remove sensitive data
      const vendorResponse = vendor.toObject();
      delete vendorResponse.password;
      delete vendorResponse.refreshToken;

      return ResponseHandler.success(res, 'Vendor profile retrieved successfully', {
        vendor: vendorResponse,
      });
    }
  );

  /**
   * Update vendor profile
   * PUT /api/v1/vendors/profile
   */
  public updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const vendor = await vendorService.updateVendorProfile(userId, req.body);

      // Remove sensitive data
      const vendorResponse = vendor.toObject();
      delete vendorResponse.password;
      delete vendorResponse.refreshToken;

      return ResponseHandler.success(res, 'Vendor profile updated successfully', {
        vendor: vendorResponse,
      });
    }
  );

  /**
   * Update vendor availability schedule
   * PUT /api/v1/vendors/availability
   */
  public updateAvailability = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { schedule } = req.body;

      const vendor = await vendorService.updateAvailabilitySchedule(userId, schedule);

      // Remove sensitive data
      const vendorResponse = vendor.toObject();
      delete vendorResponse.password;
      delete vendorResponse.refreshToken;

      return ResponseHandler.success(res, 'Availability schedule updated successfully', {
        vendor: vendorResponse,
      });
    }
  );

  /**
   * Update vendor location
   * PUT /api/v1/vendors/location
   */
  public updateLocation = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { location, serviceRadius } = req.body;

      const vendor = await vendorService.updateLocation(userId, location, serviceRadius);

      // Remove sensitive data
      const vendorResponse = vendor.toObject();
      delete vendorResponse.password;
      delete vendorResponse.refreshToken;

      return ResponseHandler.success(res, 'Vendor location updated successfully', {
        vendor: vendorResponse,
      });
    }
  );

  /**
   * Upload vendor document
   * POST /api/v1/vendors/documents
   */
  public uploadDocument = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;
      const { documentType } = req.body;

      console.log('📤 Upload request received');
      console.log('📁 req.file:', req.file);
      console.log('📋 req.body:', req.body);

      // ✅ Validate file exists
      if (!req.file) {
        throw new BadRequestError('No document file uploaded');
      }

      // ✅ Validate document type
      const validTypes: Array<'idCard' | 'businessLicense' | 'certification'> = [
        'idCard',
        'businessLicense',
        'certification',
      ];
      if (!validTypes.includes(documentType)) {
        throw new BadRequestError(
          'Invalid document type. Must be: idCard, businessLicense, or certification'
        );
      }

      try {
        let documentUrl: string;

        // ✅ Handle buffer (if using memory storage) or file path (if using disk storage)
        if (req.file.buffer) {
          // Using memory storage - upload buffer directly
          console.log('✅ Uploading from buffer');
          documentUrl = await uploadToCloudinary(req.file.buffer, {
            folder: 'vendor-documents',
            resource_type: 'auto', // Handles images and PDFs
          });
        } else if (req.file.path) {
          // Using disk storage - read file first
          console.log('✅ Uploading from file path:', req.file.path);
          const fileBuffer = fs.readFileSync(req.file.path);
          documentUrl = await uploadToCloudinary(fileBuffer, {
            folder: 'vendor-documents',
            resource_type: 'auto',
          });
          
          // Delete local file after upload
          fs.unlinkSync(req.file.path);
        } else {
          throw new BadRequestError('Invalid file format');
        }

        console.log('✅ Document uploaded to Cloudinary:', documentUrl);

        // ✅ Save document URL to database
        const vendor = await vendorService.uploadDocument(
          userId,
          documentType as 'idCard' | 'businessLicense' | 'certification',
          documentUrl
        );

        // Remove sensitive data
        const vendorResponse = vendor.toObject();
        delete vendorResponse.password;
        delete vendorResponse.refreshToken;

        return ResponseHandler.success(res, 'Document uploaded successfully', {
          vendor: vendorResponse,
        });
      } catch (error: any) {
        // Clean up local file if upload fails and file exists
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        console.error('❌ Error uploading document:', error);
        throw new BadRequestError(
          error.message || 'Failed to upload document. Please try again.'
        );
      }
    }
  );

  /**
   * Check vendor profile completion
   * GET /api/v1/vendors/profile/completion
   */
  public checkProfileCompletion = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
      const userId = req.user!.id;

      const completion = await vendorService.checkProfileCompletion(userId);

      return ResponseHandler.success(res, 'Profile completion status retrieved', completion);
    }
  );
}

export default new VendorController();
