import app from './app';
import config from './config';
import database from './config/database';
import logger from './utils/logger';
import http from 'http';
import socketService from './socket/socket.service';

class Server {
  private server: http.Server;

  constructor() {
    this.server = http.createServer(app);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await database.connect();

      // Initialize Socket.IO
      socketService.initialize(this.server);
      logger.info('Socket.IO initialized successfully');

      // Start server
      this.server.listen(config.port, () => {
        logger.info(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║           🚀 SHARPLOOK SERVER STARTED 🚀            ║
║                                                      ║
║  Environment: ${config.env.padEnd(38)} ║
║  Port: ${config.port.toString().padEnd(43)} ║
║  API Version: ${config.apiVersion.padEnd(38)} ║
║  URL: ${config.urls.backend.padEnd(43)} ║
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

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private handleServerError(error: NodeJS.ErrnoException): void {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof config.port === 'string'
      ? `Pipe ${config.port}`
      : `Port ${config.port}`;

    switch (error.code) {
      case 'EACCES':
        logger.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`\n${signal} signal received: closing HTTP server`);
      
      this.server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Disconnect Socket.IO
          const io = socketService.getIO();
          io.close(() => {
            logger.info('Socket.IO connections closed');
          });

          await database.disconnect();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      logger.error(error.name, error.message);
      logger.error(error.stack);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(reason);
      this.server.close(() => {
        process.exit(1);
      });
    });
  }

  public getServer(): http.Server {
    return this.server;
  }
}

// Start the server
const server = new Server();
server.start();

export default server.getServer();