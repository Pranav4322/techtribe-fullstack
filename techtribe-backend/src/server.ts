import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectPrisma, disconnectPrisma } from './config/prisma';
import { redis, disconnectRedis } from './config/redis';

async function bootstrap() {
  await connectPrisma();

  // Confirm Redis connectivity before accepting traffic
  await redis.ping();
  logger.info('✅ Redis ping successful');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 TechTribe API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectPrisma();
      await disconnectRedis();
      logger.info('Shutdown complete.');
      process.exit(0);
    });
    // Force exit if graceful shutdown takes too long
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.stack || err.message}`);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
