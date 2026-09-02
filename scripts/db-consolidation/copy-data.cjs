// DB consolidation — copy current app data (DATABASE_MAINNET_URL) INTO the
// old-prod target (MIGRATION_TARGET_DATABASE_URL), MERGING with old data.
// Idempotent (skipDuplicates) → safe to re-run (incl. cutover delta sync).
// Additive only: never deletes/overwrites. Run from packages/web:
//   node ../../scripts/db-consolidation/copy-data.cjs
const { PrismaClient } = require(require('path').resolve(process.cwd(), 'node_modules/@prisma/client'));
const src = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_MAINNET_URL } } });
const tgt = new PrismaClient({ datasources: { db: { url: process.env.MIGRATION_TARGET_DATABASE_URL } } });
const PLAN = [
  ['users', c => c.user], ['referrals', c => c.referral], ['referral_actions', c => c.referralAction],
  ['linked_wallets', c => c.linkedWallet], ['turnkey_wallets', c => c.turnkeyWallet],
  ['swap_logs', c => c.swapLog], ['vault_deposits', c => c.vaultDeposit],
  ['cctp_transfers', c => c.cctpTransfer], ['moneygram_transactions', c => c.moneyGramTransaction],
];
(async () => {
  const rows = [];
  for (const [name, sel] of PLAN) {
    const data = await sel(src).findMany();
    const before = await sel(tgt).count();
    let added = 0;
    if (data.length) added = (await sel(tgt).createMany({ data, skipDuplicates: true })).count;
    const after = await sel(tgt).count();
    rows.push({ table: name, source: data.length, targetBefore: before, added, targetAfter: after });
  }
  console.table(rows);
  await src.$disconnect(); await tgt.$disconnect();
})().catch(e => { console.error('ERR', e.message.split('\n')[0]); process.exit(1); });
