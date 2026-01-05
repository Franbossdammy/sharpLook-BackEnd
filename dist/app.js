"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const hpp_1 = __importDefault(require("hpp"));
const config_1 = __importDefault(require("./config"));
const error_1 = require("./middlewares/error");
const rateLimit_1 = require("./middlewares/rateLimit");
const response_1 = __importDefault(require("./utils/response"));
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddlewares() {
        // Security middlewares
        this.app.use((0, helmet_1.default)({
            crossOriginResourcePolicy: { policy: "cross-origin" },
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: config_1.default.urls.frontend,
            credentials: true,
            optionsSuccessStatus: 200,
        }));
        // Body parser middlewares
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use((0, cookie_parser_1.default)());
        // Data sanitization against NoSQL query injection
        this.app.use((0, express_mongo_sanitize_1.default)());
        // Prevent parameter pollution
        this.app.use((0, hpp_1.default)());
        // Compression middleware
        this.app.use((0, compression_1.default)());
        // Logging middleware
        if (config_1.default.env === 'development') {
            this.app.use((0, morgan_1.default)('dev'));
        }
        else {
            this.app.use((0, morgan_1.default)('combined'));
        }
        // Rate limiting
        this.app.use(`/api/${config_1.default.apiVersion}`, rateLimit_1.apiLimiter);
        // Trust proxy
        this.app.set('trust proxy', 1);
    }
    initializeRoutes() {
        // Health check route
        this.app.get('/health', (_req, res) => {
            response_1.default.success(res, 'Server is running', {
                status: 'healthy',
                environment: config_1.default.env,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            });
        });
        // API welcome route
        this.app.get(`/api/${config_1.default.apiVersion}`, (_req, res) => {
            response_1.default.success(res, 'Welcome to SharpLook API', {
                version: config_1.default.apiVersion,
                description: config_1.default.app.description,
                documentation: `${config_1.default.urls.backend}/api/${config_1.default.apiVersion}/docs`,
            });
        });
        // Import routes
        const authRoutes = require('./routes/auth.routes').default;
        const userRoutes = require('./routes/user.routes').default;
        const categoryRoutes = require('./routes/category.routes').default;
        const serviceRoutes = require('./routes/service.routes').default;
        const bookingRoutes = require('./routes/booking.routes').default;
        const paymentRoutes = require('./routes/payment.routes').default;
        const disputeRoutes = require('./routes/dispute.routes').default;
        const reviewRoutes = require('./routes/review.routes').default;
        const chatRoutes = require('./routes/chat.routes').default;
        const notificationRoutes = require('./routes/notification.routes').default;
        const referralRoutes = require('./routes/referral.routes').default;
        const analyticsRoutes = require('./routes/analytics.routes').default;
        const subscriptionRoutes = require('./routes/subscription.routes').default;
        const offerRoutes = require('./routes/offer.routes').default;
        const productRoutes = require('./routes/product.routes').default;
        const OrderRoutes = require('./routes/order.routes').default;
        const disputeProductRoutes = require('./routes/disputeProduct.routes').default;
        const vendorAnalytics = require('./routes/vendorAnalytics.routes').default;
        const vendorRoutes = require('./routes/vendor.routes').default;
        const callRoutes = require('./routes/call.routes').default;
        const transactionRoutes = require('./routes/transaction.routes').default;
        const sharpPayRoutes = require('./routes/sharpPay.routes').default;
        const webhooks = require('./routes/webhooks.routes').default;
        const redFlagsRoutes = require('./routes/redFlag.routes').default;
        // ✅ Import message routes
        const messageRoutes = require('./routes/message.routes').default;
        // ✅ Import startCronJobs correctly
        const { startCronJobs } = require('./utils/cronJobs');
        // Mount routes
        this.app.use(`/api/${config_1.default.apiVersion}/auth`, authRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/users`, userRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/categories`, categoryRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/services`, serviceRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/bookings`, bookingRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/payments`, paymentRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/disputes`, disputeRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/reviews`, reviewRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/chat`, chatRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/notifications`, notificationRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/referrals`, referralRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/analytics`, analyticsRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/subscriptions`, subscriptionRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/offers`, offerRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/products`, productRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/orders`, OrderRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/disputesProduct`, disputeProductRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/vendorAnalytics`, vendorAnalytics);
        this.app.use(`/api/${config_1.default.apiVersion}/vendors`, vendorRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/calls`, callRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/transactions`, transactionRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/sharppay`, sharpPayRoutes);
        this.app.use(`/api/${config_1.default.apiVersion}/webhooks`, webhooks);
        this.app.use(`/api/${config_1.default.apiVersion}/redFlag`, redFlagsRoutes);
        // ✅ Mount message routes
        this.app.use(`/api/${config_1.default.apiVersion}/messages`, messageRoutes);
        // ✅ Start cron jobs after routes are initialized
        startCronJobs();
    }
    initializeErrorHandling() {
        // Handle 404 errors
        this.app.use(error_1.notFound);
        // Global error handler
        this.app.use(error_1.errorHandler);
    }
    getApp() {
        return this.app;
    }
}
exports.default = new App().getApp();
//# sourceMappingURL=app.js.map