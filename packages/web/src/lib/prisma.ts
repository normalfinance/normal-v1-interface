import { PrismaClient } from '@prisma/client';
import { logger, constants } from '@normalfinance/utils';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getDatabaseUrl = () =>
  constants.getNetworkConfig(
    process.env.DATABASE_TESTNET_URL!,
    process.env.DATABASE_MAINNET_URL || process.env.DATABASE_URL!
  );

const getDirectUrl = () =>
  constants.getNetworkConfig(
    process.env.DIRECT_TESTNET_URL,
    process.env.DIRECT_MAINNET_URL || process.env.DIRECT_URL
  );

const _dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(_dbUrl ? { datasources: { db: { url: _dbUrl } } } : undefined);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  logger.log(`[Prisma] Connected to ${constants.getCurrentNetwork()} database`);
}
