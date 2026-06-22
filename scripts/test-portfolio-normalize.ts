/* Unit tests for the pure portfolio/savings normalization logic.
 * Run: npx tsx ./tmp-normalize-test.ts */
import {
  buildAsset,
  applyStaleFallback,
  reconcileSavingsPosition,
} from '../packages/web/src/lib/portfolio/normalize';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ FAIL: ${msg}`); }
};

console.log('\n=== buildAsset ===');
{
  const a = buildAsset('BTC', 'bc1q', 0.5, 60000);
  ok(a.status === 'ok' && a.balance === '0.5' && a.usdValue === '30000', 'ok asset with balance×price');

  const noAddr = buildAsset('ETH', null, null, 3000);
  ok(noAddr.status === 'ok' && noAddr.balance === '0' && noAddr.usdValue === '0', 'no address → 0 (not error)');

  const err = buildAsset('SOL', 'addr', null, 150);
  ok(err.status === 'error' && err.balance === null && err.usdValue === null, 'address + null balance → error');

  const noPrice = buildAsset('XLM', 'G...', 100, null);
  ok(noPrice.status === 'ok' && noPrice.balance === '100' && noPrice.usdValue === null, 'no price → usdValue null, still ok');
}

console.log('\n=== applyStaleFallback ===');
{
  const fresh = {
    updatedAt: 1,
    assets: [
      buildAsset('BTC', 'bc1q', 0.5, 60000), // ok
      buildAsset('ETH', '0x', null, 3000),   // error
    ],
  };
  const lastGood = { ETH: buildAsset('ETH', '0x', 1.2, 3000) }; // prior good ETH
  const { merged, snapshot } = applyStaleFallback(fresh, lastGood);
  const eth = merged.assets.find((a) => a.symbol === 'ETH')!;
  ok(eth.status === 'stale' && eth.balance === '1.2', 'errored asset falls back to last-good as stale');
  ok(merged.assets.find((a) => a.symbol === 'BTC')!.status === 'ok', 'ok asset unchanged');
  ok(snapshot.BTC?.balance === '0.5', 'snapshot refreshed with the ok asset');

  const noPrior = applyStaleFallback(fresh, null);
  ok(noPrior.merged.assets.find((a) => a.symbol === 'ETH')!.status === 'error', 'error with no last-good stays error');
}

console.log('\n=== reconcileSavingsPosition (the bug we just fixed) ===');
{
  const held = { shares: '20', currentValue: '20.89', totalDeposited: '20.72', earnings: '0.17' };

  // The regression: a transient empty/zero read must NOT clobber a held balance.
  ok(reconcileSavingsPosition(undefined, held).currentValue === '20.89', 'empty read keeps held position');
  ok(
    reconcileSavingsPosition({ shares: '0', currentValue: '0', totalDeposited: '0', earnings: '0' }, held).currentValue === '20.89',
    'zeroed read keeps held position'
  );

  // Genuine empty (new user, nothing cached) → 0.
  ok(reconcileSavingsPosition(undefined, null).currentValue === '0', 'no api + no cache → 0');

  // Normal fresh read with no prior → pass through.
  const fresh = { shares: '5', currentValue: '5.10', totalDeposited: '5', earnings: '0.10' };
  ok(reconcileSavingsPosition(fresh, null).currentValue === '5.10', 'fresh read with no prior passes through');

  // Indexer lag: small totalDeposited dip after an optimistic deposit → keep prev TD.
  const apiLag = { shares: '20', currentValue: '20.89', totalDeposited: '20.0', earnings: '0.5' };
  const prevAfterDeposit = { shares: '20', currentValue: '20.89', totalDeposited: '20.72', earnings: '0.17' };
  const merged = reconcileSavingsPosition(apiLag, prevAfterDeposit);
  ok(merged.totalDeposited === '20.72', 'small indexer lag keeps prev totalDeposited');

  // Legitimate large drop (e.g. real withdrawal) → accept the API value.
  const apiWithdraw = { shares: '5', currentValue: '5.0', totalDeposited: '5.0', earnings: '0' };
  const prevBig = { shares: '20', currentValue: '20.89', totalDeposited: '20.72', earnings: '0.17' };
  ok(reconcileSavingsPosition(apiWithdraw, prevBig).totalDeposited === '5.0', 'large drop (withdrawal) is accepted');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail === 0 ? 0 : 1);
