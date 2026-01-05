import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  apiVersion: string;
  mongodb: {
    uri: string;
    testUri: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
  paystack: {
    secretKey: string;
    publicKey: string;
    webhookSecret: string;
  };
   platformFeeRate: number;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  redis: {
    url: string;
    password?: string;
    db: number;
  };
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  urls: {
    frontend: string;
    backend: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  fileUpload: {
    maxFileSize: number;
    allowedTypes: string[];
  };
  distance: {
    baseDistanceKm: number;
    baseChargeNaira: number;
  };
  referral: {
    bonusAmount: number;
    minBookingAmount: number;
  };
  admin: {
    email: string;
    password: string;
  };
  session: {
    secret: string;
  };
  encryption: {
    key: string;
  };
  app: {
    name: string;
    description: string;
    supportEmail: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sharplook',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/sharplook-test',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
email: {
  host: process.env.RESEND_HOST || 'api.resend.com', // Not required but kept for structure
  port: parseInt(process.env.RESEND_PORT || '443', 10), // Not required
  secure: true, // Always HTTPS for Resend
  user: process.env.RESEND_API_KEY || '',
  password: process.env.RESEND_API_KEY || '', // Not used but kept for structure consistency
  from: process.env.EMAIL_FROM || 'SharpLook <noreply@sharplook.com>',
},

  
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  },

    platformFeeRate: parseInt(process.env.PLATFORM_FEE_RATE || '5', 10), // ADD THIS LINE - Default 5%

  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    backend: process.env.BACKEND_URL || 'http://localhost:5000',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg,image/webp').split(','),
  },
  
  distance: {
    baseDistanceKm: parseInt(process.env.BASE_DISTANCE_KM || '5', 10),
    baseChargeNaira: parseInt(process.env.BASE_CHARGE_NAIRA || '1000', 10),
  },
  
  referral: {
    bonusAmount: parseInt(process.env.REFERRAL_BONUS_AMOUNT || '500', 10),
    minBookingAmount: parseInt(process.env.REFERRAL_MIN_BOOKING_AMOUNT || '2000', 10),
  },
  
  admin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@sharplook.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
  },
  
  app: {
    name: process.env.APP_NAME || 'SharpLook',
    description: process.env.APP_DESCRIPTION || 'Service Booking Platform',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@sharplook.com',
  },
};

export default config;
