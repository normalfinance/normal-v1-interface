// #10 — transaction-pooler verification (READ-ONLY; doc 68 runbook).
//
// Proves Prisma works through Supabase's transaction pooler BEFORE the
// DATABASE_URL flip in Vercel. The pooler's known incompatibility is
// prepared statements — `pgbouncer=true` in the URL makes Prisma disable
// them; this script exercises exactly the patterns that break when that
// param is missing.
//
// Usage (from packages/web):
//   node scripts/verify-pooler.mjs "postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
//
// Expected: all four checks PASS. If check 2 fails with "prepared statement
// ... already exists" → the pgbouncer=true param is missing from the URL.

import { PrismaClient } from '@prisma/client';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/verify-pooler.mjs "<transaction-pooler-DATABASE_URL>"');
  process.exit(1);
}
if (!/[?&]pgbouncer=true/.test(url)) {
  console.warn(
    'WARNING: URL is missing pgbouncer=true — Prisma will use prepared statements and the pooler WILL error.'
  );
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
let failed = false;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed = true;
    console.error(`FAIL  ${name}: ${err.message?.split('\n')[0]}`);
  }
}

// 1. Basic connectivity.
await check('connect + simple query', async () => {
  await prisma.$queryRaw`SELECT 1`;
});

// 2. The prepared-statement trap: the same parameterized query repeatedly —
//    this is what every API route does on a warm instance.
await check('repeated identical queries (prepared-statement trap)', async () => {
  for (let i = 0; i < 5; i++) {
    await prisma.linkedWallet.findMany({ take: 1 });
  }
});

// 3. A read transaction (the pooler serves transaction-scoped connections).
await check('read transaction', async () => {
  await prisma.$transaction([prisma.turnkeyWallet.count(), prisma.swapLog.count()]);
});

// 4. Concurrency: 10 parallel reads through the shared pool.
await check('10 concurrent reads', async () => {
  await Promise.all(Array.from({ length: 10 }, () => prisma.vaultDeposit.count()));
});

await prisma.$disconnect();
console.log(
  failed
    ? '\nRESULT: FAILED — do NOT flip DATABASE_URL yet.'
    : '\nRESULT: ALL PASS — safe to flip DATABASE_URL per the doc-68 runbook.'
);
process.exit(failed ? 1 : 0);
