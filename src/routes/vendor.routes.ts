// vendor.routes.ts - CORRECTED WITH YOUR EXISTING UPLOAD MIDDLEWARE
import { Router } from 'express';
import vendorController from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { uploadSingleDocument } from '../middlewares/upload'; // Using your existing middleware
import { UserRole } from '../types';
import {
  updateVendorProfileValidation,
  updateAvailabilityValidation,
  updateLocationValidation,
} from '../validations/vendor.validation';

const router = Router();

// All routes require authentication as vendor
router.use(authenticate);
router.use(authorize(UserRole.VENDOR));

/**
 * @route   GET /api/v1/vendors/profile
 * @desc    Get vendor profile
 * @access  Private (Vendor)
 */
router.get('/profile', vendorController.getProfile);

/**
 * @route   PUT /api/v1/vendors/profile
 * @desc    Update vendor profile
 * @access  Private (Vendor)
 */
router.put(
  '/profile',
  validate(updateVendorProfileValidation),
  vendorController.updateProfile
);

/**
 * @route   PUT /api/v1/vendors/availability
 * @desc    Update vendor availability schedule
 * @access  Private (Vendor)
 */
router.put(
  '/availability',
  validate(updateAvailabilityValidation),
  vendorController.updateAvailability
);

/**
 * @route   PUT /api/v1/vendors/location
 * @desc    Update vendor location
 * @access  Private (Vendor)
 */
router.put(
  '/location',
  validate(updateLocationValidation),
  vendorController.updateLocation
);

/**
 * @route   POST /api/v1/vendors/documents
 * @desc    Upload vendor document
 * @access  Private (Vendor)
 * @note    Uses uploadSingleDocument middleware - expects 'document' field in FormData
 */
router.post(
  '/documents',
  uploadSingleDocument, // This middleware handles .single('document')
  vendorController.uploadDocument
);

/**
 * @route   GET /api/v1/vendors/profile/completion
 * @desc    Check vendor profile completion status
 * @access  Private (Vendor)
 */
router.get('/profile/completion', vendorController.checkProfileCompletion);

export default router;