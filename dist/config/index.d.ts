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
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map