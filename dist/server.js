"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const database_1 = __importDefault(require("./config/database"));
const logger_1 = __importDefault(require("./utils/logger"));
const http_1 = __importDefault(require("http"));
const socket_service_1 = __importDefault(require("./socket/socket.service"));
class Server {
    constructor() {
        this.server = http_1.default.createServer(app_1.default);
    }
    async start() {
        try {
            // Connect to database
            await database_1.default.connect();
            // Initialize Socket.IO
            socket_service_1.default.initialize(this.server);
            logger_1.default.info('Socket.IO initialized successfully');
            // Start server
            this.server.listen(config_1.default.port, () => {
                logger_1.default.info(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║           🚀 SHARPLOOK SERVER STARTED 🚀            ║
║                                                      ║
║  Environment: ${config_1.default.env.padEnd(38)} ║
║  Port: ${config_1.default.port.toString().padEnd(43)} ║
║  API Version: ${config_1.default.apiVersion.padEnd(38)} ║
║  URL: ${config_1.default.urls.backend.padEnd(43)} ║
║  Socket.IO: ✅ Ready                                ║
║  Online Users: 0                                     ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
        `);
            });
            // Handle server errors
            this.server.on('error', this.handleServerError);
            // Graceful shutdown
            this.setupGracefulShutdown();
        }
        catch (error) {
            logger_1.default.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    handleServerError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }
        const bind = typeof config_1.default.port === 'string'
            ? `Pipe ${config_1.default.port}`
            : `Port ${config_1.default.port}`;
        switch (error.code) {
            case 'EACCES':
                logger_1.default.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                logger_1.default.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    }
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger_1.default.info(`\n${signal} signal received: closing HTTP server`);
            this.server.close(async () => {
                logger_1.default.info('HTTP server closed');
                try {
                    // Disconnect Socket.IO
                    const io = socket_service_1.default.getIO();
                    io.close(() => {
                        logger_1.default.info('Socket.IO connections closed');
                    });
                    await database_1.default.disconnect();
                    logger_1.default.info('Database connection closed');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.default.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
            // Force close after 30 seconds
            setTimeout(() => {
                logger_1.default.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };
        // Listen for termination signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.default.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
            logger_1.default.error(error.name, error.message);
            logger_1.default.error(error.stack);
            process.exit(1);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, _promise) => {
            logger_1.default.error('UNHANDLED REJECTION! 💥 Shutting down...');
            logger_1.default.error(reason);
            this.server.close(() => {
                process.exit(1);
            });
        });
    }
    getServer() {
        return this.server;
    }
}
// Start the server
const server = new Server();
server.start();
exports.default = server.getServer();
//# sourceMappingURL=server.js.map