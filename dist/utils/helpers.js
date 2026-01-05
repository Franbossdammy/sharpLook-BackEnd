"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncate = exports.generateOTP = exports.sanitizeFilename = exports.getDateRange = exports.addDays = exports.isExpired = exports.sleep = exports.formatNigerianPhone = exports.isValidNigerianPhone = exports.generateTransactionRef = exports.maskPhone = exports.maskEmail = exports.calculateServiceCharge = exports.calculateDistance = exports.parsePaginationParams = exports.formatCurrency = exports.calculatePercentage = exports.slugify = exports.decrypt = exports.encrypt = exports.hashString = exports.generateVerificationToken = exports.generateReferralCode = exports.generateRandomString = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateRandomString = generateRandomString;
/**
 * Generate referral code
 */
const generateReferralCode = (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};
exports.generateReferralCode = generateReferralCode;
/**
 * Generate verification token
 */
const generateVerificationToken = () => {
    // Generate a random 6-digit number (100000 to 999999)
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
};
exports.generateVerificationToken = generateVerificationToken;
/**
 * Hash a string using SHA256
 */
const hashString = (str) => {
    return crypto_1.default.createHash('sha256').update(str).digest('hex');
};
exports.hashString = hashString;
/**
 * Encrypt data
 */
const encrypt = (text) => {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(config_1.default.encryption.key, 'utf-8').slice(0, 32), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};
exports.encrypt = encrypt;
/**
 * Decrypt data
 */
const decrypt = (text) => {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(config_1.default.encryption.key, 'utf-8').slice(0, 32), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
exports.decrypt = decrypt;
/**
 * Generate slug from string
 */
const slugify = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
exports.slugify = slugify;
/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
    if (total === 0)
        return 0;
    return Math.round((value / total) * 100);
};
exports.calculatePercentage = calculatePercentage;
/**
 * Format currency (Naira)
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
/**
 * Parse pagination parameters
 */
const parsePaginationParams = (page, limit) => {
    const parsedPage = Math.max(1, parseInt(String(page || 1)));
    const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit || 10))));
    const skip = (parsedPage - 1) * parsedLimit;
    return { page: parsedPage, limit: parsedLimit, skip };
};
exports.parsePaginationParams = parsePaginationParams;
/**
 * Calculate distance between two coordinates (in kilometers)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};
exports.calculateDistance = calculateDistance;
/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};
/**
 * Calculate service charge based on distance
 */
const calculateServiceCharge = (distanceKm) => {
    const { baseDistanceKm, baseChargeNaira } = config_1.default.distance;
    if (distanceKm <= baseDistanceKm) {
        return baseChargeNaira;
    }
    const extraKm = distanceKm - baseDistanceKm;
    const extraCharge = Math.ceil(extraKm / baseDistanceKm) * baseChargeNaira;
    return baseChargeNaira + extraCharge;
};
exports.calculateServiceCharge = calculateServiceCharge;
/**
 * Mask sensitive data (e.g., email, phone)
 */
const maskEmail = (email) => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.substring(0, 2) + '***' + username.substring(username.length - 1);
    return `${maskedUsername}@${domain}`;
};
exports.maskEmail = maskEmail;
const maskPhone = (phone) => {
    return phone.substring(0, 4) + '***' + phone.substring(phone.length - 2);
};
exports.maskPhone = maskPhone;
/**
 * Generate transaction reference
 */
const generateTransactionRef = (prefix = 'TXN') => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${prefix}-${timestamp}-${random}`;
};
exports.generateTransactionRef = generateTransactionRef;
/**
 * Validate Nigerian phone number
 */
const isValidNigerianPhone = (phone) => {
    const regex = /^(\+234|234|0)[7-9][0-1]\d{8}$/;
    return regex.test(phone);
};
exports.isValidNigerianPhone = isValidNigerianPhone;
/**
 * Format Nigerian phone number to international format
 */
const formatNigerianPhone = (phone) => {
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
exports.formatNigerianPhone = formatNigerianPhone;
/**
 * Sleep function for delays
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
/**
 * Check if date is expired
 */
const isExpired = (date) => {
    return new Date() > new Date(date);
};
exports.isExpired = isExpired;
/**
 * Add days to date
 */
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
exports.addDays = addDays;
/**
 * Get date range for analytics
 */
const getDateRange = (period) => {
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
exports.getDateRange = getDateRange;
/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
};
exports.sanitizeFilename = sanitizeFilename;
/**
 * Generate OTP
 */
const generateOTP = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};
exports.generateOTP = generateOTP;
/**
 * Truncate string
 */
const truncate = (str, length = 50) => {
    if (str.length <= length)
        return str;
    return str.substring(0, length) + '...';
};
exports.truncate = truncate;
//# sourceMappingURL=helpers.js.map