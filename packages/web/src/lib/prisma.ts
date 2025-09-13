import { PrismaClient } from '@prisma/client';
import { constants } from '@normalfinance/utils';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getDatabaseUrl = () => {
  return constants.getNetworkConfig(
    process.env.DATABASE_URL!, 
    process.env.DATABASE_MAINNET_URL || process.env.DATABASE_URL!   
  );
};

const getDirectUrl = () => {
  return constants.getNetworkConfig(
    process.env.DIRECT_URL, 
    process.env.DIRECT_MAINNET_URL || process.env.DIRECT_URL 
  );
};

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
  console.log(`[Prisma] Connected to ${constants.getCurrentNetwork()} database`);
}
