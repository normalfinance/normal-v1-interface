// One-off diagnostic: list every wallet + account in a Turnkey sub-org and
// check each Bitcoin address balance on mempool.space.
// Usage: node scripts/find-btc-funds.mjs <subOrgId>
import { readFileSync } from 'node:fs';
import { Turnkey } from '@turnkey/sdk-server';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)=["']?([^"'\r]*)["']?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);

const subOrgId = process.argv[2];
if (!subOrgId) {
  console.error('Usage: node scripts/find-btc-funds.mjs <subOrgId>');
  process.exit(1);
}

const turnkey = new Turnkey({
  apiBaseUrl: 'https://api.turnkey.com',
  apiPrivateKey: env.TURNKEY_API_PRIVATE_KEY,
  apiPublicKey: env.TURNKEY_API_PUBLIC_KEY,
  defaultOrganizationId: env.TURNKEY_ORGANIZATION_ID,
});

const api = turnkey.apiClient();
const { wallets } = await api.getWallets({ organizationId: subOrgId });
console.log(`Sub-org ${subOrgId} has ${wallets.length} wallet(s)\n`);

for (const w of wallets) {
  console.log(`Wallet: "${w.walletName}" (${w.walletId})  imported=${w.imported}`);
  const { accounts } = await api.getWalletAccounts({ organizationId: subOrgId, walletId: w.walletId });
  for (const a of accounts) {
    let balanceNote = '';
    if (a.addressFormat.startsWith('ADDRESS_FORMAT_BITCOIN')) {
      const r = await fetch(`https://mempool.space/api/address/${a.address}`);
      if (r.ok) {
        const d = await r.json();
        const confirmed = d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum;
        const pending = d.mempool_stats.funded_txo_sum - d.mempool_stats.spent_txo_sum;
        balanceNote = `  → balance: ${confirmed} sat confirmed, ${pending} sat pending, ${d.chain_stats.tx_count} txs`;
      }
    }
    console.log(`  ${a.addressFormat.replace('ADDRESS_FORMAT_', '')}  ${a.address}${balanceNote}`);
  }
  console.log('');
}
