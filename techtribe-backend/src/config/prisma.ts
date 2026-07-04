import { PrismaClient } from '@prisma/client';
import { isProduction } from './env';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['warn', 'error']
  });

if (!isProduction) global.__prisma__ = prisma;

export async function connectPrisma() {
  await prisma.$connect();
  logger.info('✅ PostgreSQL connected (Prisma)');
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
