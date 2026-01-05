/**
 * Generate random string
 */
export declare const generateRandomString: (length?: number) => string;
/**
 * Generate referral code
 */
export declare const generateReferralCode: (length?: number) => string;
/**
 * Generate verification token
 */
export declare const generateVerificationToken: () => string;
/**
 * Hash a string using SHA256
 */
export declare const hashString: (str: string) => string;
/**
 * Encrypt data
 */
export declare const encrypt: (text: string) => string;
/**
 * Decrypt data
 */
export declare const decrypt: (text: string) => string;
/**
 * Generate slug from string
 */
export declare const slugify: (text: string) => string;
/**
 * Calculate percentage
 */
export declare const calculatePercentage: (value: number, total: number) => number;
/**
 * Format currency (Naira)
 */
export declare const formatCurrency: (amount: number) => string;
/**
 * Parse pagination parameters
 */
export declare const parsePaginationParams: (page?: string | number, limit?: string | number) => {
    page: number;
    limit: number;
    skip: number;
};
/**
 * Calculate distance between two coordinates (in kilometers)
 */
export declare const calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
/**
 * Calculate service charge based on distance
 */
export declare const calculateServiceCharge: (distanceKm: number) => number;
/**
 * Mask sensitive data (e.g., email, phone)
 */
export declare const maskEmail: (email: string) => string;
export declare const maskPhone: (phone: string) => string;
/**
 * Generate transaction reference
 */
export declare const generateTransactionRef: (prefix?: string) => string;
/**
 * Validate Nigerian phone number
 */
export declare const isValidNigerianPhone: (phone: string) => boolean;
/**
 * Format Nigerian phone number to international format
 */
export declare const formatNigerianPhone: (phone: string) => string;
/**
 * Sleep function for delays
 */
export declare const sleep: (ms: number) => Promise<void>;
/**
 * Check if date is expired
 */
export declare const isExpired: (date: Date) => boolean;
/**
 * Add days to date
 */
export declare const addDays: (date: Date, days: number) => Date;
/**
 * Get date range for analytics
 */
export declare const getDateRange: (period: "day" | "week" | "month" | "year") => {
    startDate: Date;
    endDate: Date;
};
/**
 * Sanitize filename
 */
export declare const sanitizeFilename: (filename: string) => string;
/**
 * Generate OTP
 */
export declare const generateOTP: (length?: number) => string;
/**
 * Truncate string
 */
export declare const truncate: (str: string, length?: number) => string;
//# sourceMappingURL=helpers.d.ts.map