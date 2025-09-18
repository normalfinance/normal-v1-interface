import { PrismaClient } from '@prisma/client';
import { constants, logger } from '@normalfinance/utils';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getDatabaseUrl = () =>
  constants.getNetworkConfig(
    process.env.DATABASE_URL!,
    process.env.DATABASE_MAINNET_URL || process.env.DATABASE_URL!
  );

const getDirectUrl = () =>
  constants.getNetworkConfig(
    process.env.DIRECT_URL,
    process.env.DIRECT_MAINNET_URL || process.env.DIRECT_URL
  );

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  logger.log(`[Prisma] Connected to ${constants.getCurrentNetwork()} database`);
}
