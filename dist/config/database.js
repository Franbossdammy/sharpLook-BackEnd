"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
const logger_1 = __importDefault(require("../utils/logger"));
class Database {
    constructor() { }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    async connect() {
        try {
            const uri = index_1.default.env === 'test' ? index_1.default.mongodb.testUri : index_1.default.mongodb.uri;
            const options = {
                autoIndex: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            };
            await mongoose_1.default.connect(uri, options);
            logger_1.default.info('✅ MongoDB connected successfully');
            mongoose_1.default.connection.on('error', (error) => {
                logger_1.default.error('MongoDB connection error:', error);
            });
            mongoose_1.default.connection.on('disconnected', () => {
                logger_1.default.warn('MongoDB disconnected');
            });
            mongoose_1.default.connection.on('reconnected', () => {
                logger_1.default.info('MongoDB reconnected');
            });
            // Handle application termination
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });
        }
        catch (error) {
            logger_1.default.error('❌ MongoDB connection failed:', error);
            process.exit(1);
        }
    }
    async disconnect() {
        try {
            await mongoose_1.default.connection.close();
            logger_1.default.info('MongoDB connection closed');
        }
        catch (error) {
            logger_1.default.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }
    async dropDatabase() {
        if (index_1.default.env === 'test') {
            await mongoose_1.default.connection.dropDatabase();
            logger_1.default.info('Test database dropped');
        }
    }
    async clearCollections() {
        if (index_1.default.env === 'test') {
            const collections = mongoose_1.default.connection.collections;
            for (const key in collections) {
                await collections[key].deleteMany({});
            }
            logger_1.default.info('Test collections cleared');
        }
    }
}
exports.default = Database.getInstance();
//# sourceMappingURL=database.js.map