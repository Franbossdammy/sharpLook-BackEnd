import crypto from 'crypto';
import config from '../config';

/**
 * Generate random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate referral code
 */
export const generateReferralCode = (length: number = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

/**
 * Generate verification token
 */
export const generateVerificationToken = (): string => {
  // Generate a random 6-digit number (100000 to 999999)
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};


/**
 * Hash a string using SHA256
 */
export const hashString = (str: string): string => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Encrypt data
 */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(config.encryption.key, 'utf-8').slice(0, 32),
    iv
  );
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypt data
 */
export const decrypt = (text: string): string => {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(config.encryption.key, 'utf-8').slice(0, 32),
    iv
  );
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
};

/**
 * Generate slug from string
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Format currency (Naira)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

/**
 * Parse pagination parameters
 */
export const parsePaginationParams = (
  page?: string | number,
  limit?: string | number
) => {
  const parsedPage = Math.max(1, parseInt(String(page || 1)));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit || 10))));
  const skip = (parsedPage - 1) * parsedLimit;
  
  return { page: parsedPage, limit: parsedLimit, skip };
};

/**
 * Calculate distance between two coordinates (in kilometers)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate service charge based on distance
 */
export const calculateServiceCharge = (distanceKm: number): number => {
  const { baseDistanceKm, baseChargeNaira } = config.distance;
  
  if (distanceKm <= baseDistanceKm) {
    return baseChargeNaira;
  }
  
  const extraKm = distanceKm - baseDistanceKm;
  const extraCharge = Math.ceil(extraKm / baseDistanceKm) * baseChargeNaira;
  
  return baseChargeNaira + extraCharge;
};

/**
 * Mask sensitive data (e.g., email, phone)
 */
export const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.substring(0, 2) + '***' + username.substring(username.length - 1);
  return `${maskedUsername}@${domain}`;
};

export const maskPhone = (phone: string): string => {
  return phone.substring(0, 4) + '***' + phone.substring(phone.length - 2);
};

/**
 * Generate transaction reference
 */
export const generateTransactionRef = (prefix: string = 'TXN'): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Validate Nigerian phone number
 */
export const isValidNigerianPhone = (phone: string): boolean => {
  const regex = /^(\+234|234|0)[7-9][0-1]\d{8}$/;
  return regex.test(phone);
};

/**
 * Format Nigerian phone number to international format
 */
export const formatNigerianPhone = (phone: string): string => {
  // Remove any spaces or special characters
  phone = phone.replace(/[\s()-]/g, '');
  
  // If starts with 0, replace with +234
  if (phone.startsWith('0')) {
    return '+234' + phone.substring(1);
  }
  
  // If starts with 234, add +
  if (phone.startsWith('234')) {
    return '+' + phone;
  }
  
  // If starts with +234, return as is
  if (phone.startsWith('+234')) {
    return phone;
  }
  
  // Otherwise, assume it's missing country code
  return '+234' + phone;
};

/**
 * Sleep function for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if date is expired
 */
export const isExpired = (date: Date): boolean => {
  return new Date() > new Date(date);
};

/**
 * Add days to date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get date range for analytics
 */
export const getDateRange = (period: 'day' | 'week' | 'month' | 'year'): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'day':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  return { startDate, endDate };
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Generate OTP
 */
export const generateOTP = (length: number = 6): string => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

/**
 * Truncate string
 */
export const truncate = (str: string, length: number = 50): string => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};


