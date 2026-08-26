// Chain reads for ramp tracking (doc 89 F2), server-side. Two questions:
//   liveChainBalance  — what does this wallet hold RIGHT NOW (the arrival
//                       baseline captured at commit)?
//   hasIncomingSince  — did a CONFIRMED incoming transfer land after a given
//                       moment (arrival proof for rows with no baseline)?
// Every answer degrades to null/false on failure — a dead RPC must never
// invent an arrival, and the 45-minute abandonment still bounds every row.

export async function liveChainBalance(
  chain: string,
  network: string,
  address: string,
  asset: string
): Promise<string | null> {
  if (network !== 'mainnet') return null;
  try {
    if (chain === 'solana' && asset === 'SOL') {
      const res = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const lamports = (await res.json())?.result?.value;
      return Number.isFinite(lamports) ? String(lamports / 1e9) : null;
    }
    if (chain === 'ethereum' && asset === 'ETH') {
      const rpcUrl = process.env.NEXT_PUBLIC_ETH_RPC_URL ?? 'https://ethereum-rpc.publicnode.com';
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const hex = (await res.json())?.result;
      return typeof hex === 'string' ? String(Number.parseInt(hex, 16) / 1e18) : null;
    }
    if (chain === 'bitcoin' && asset === 'BTC') {
      const res = await fetch(`https://mempool.space/api/address/${address}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const d = await res.json();
      const sat = (d?.chain_stats?.funded_txo_sum ?? 0) - (d?.chain_stats?.spent_txo_sum ?? 0);
      return Number.isFinite(sat) ? String(sat / 1e8) : null;
    }
    if (chain === 'stellar') {
      const res = await fetch(`https://horizon.stellar.org/accounts/${address}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) return '0'; // unfunded: genuinely zero
      if (!res.ok) return null;
      const balances: any[] = (await res.json())?.balances ?? [];
      const entry =
        asset === 'XLM'
          ? balances.find((b) => b.asset_type === 'native')
          : balances.find((b) => b.asset_code === asset);
      const n = Number(entry?.balance ?? NaN);
      return Number.isFinite(n) ? String(n) : asset === 'XLM' ? null : '0';
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** true = a CONFIRMED incoming transfer of this asset landed after sinceMs;
 *  false = recent history checked, none found; null = could not determine
 *  (unsupported chain or a failed lookup) — null must never claim arrival.
 *  Ethereum returns null: listing txs needs an indexer we do not depend on
 *  here; ETH rows with a baseline still arrive by balance, the rest fall to
 *  the 45-minute abandonment. */
export async function hasIncomingSince(
  chain: string,
  network: string,
  address: string,
  asset: string,
  sinceMs: number
): Promise<boolean | null> {
  if (network !== 'mainnet') return null;
  try {
    if (chain === 'solana' && asset === 'SOL') {
      const rpc = async (method: string, params: unknown[]) => {
        const res = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          signal: AbortSignal.timeout(8000),
        });
        return (await res.json())?.result;
      };
      const sigs: any[] = (await rpc('getSignaturesForAddress', [address, { limit: 10 }])) ?? [];
      const fresh = sigs.filter((sg) => !sg.err && sg.blockTime && sg.blockTime * 1000 > sinceMs);
      for (const sg of fresh.slice(0, 4)) {
        const tx = await rpc('getTransaction', [
          sg.signature,
          { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
        ]);
        const keys: any[] = tx?.transaction?.message?.accountKeys ?? [];
        const idx = keys.findIndex((k) => (typeof k === 'string' ? k : k?.pubkey) === address);
        if (idx >= 0) {
          const pre = Number(tx?.meta?.preBalances?.[idx] ?? NaN);
          const post = Number(tx?.meta?.postBalances?.[idx] ?? NaN);
          if (Number.isFinite(pre) && Number.isFinite(post) && post > pre) return true;
        }
      }
      return false;
    }
    if (chain === 'stellar') {
      const res = await fetch(
        `https://horizon.stellar.org/accounts/${address}/payments?order=desc&limit=10`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return res.status === 404 ? false : null;
      const records: any[] = (await res.json())?._embedded?.records ?? [];
      return records.some((r) => {
        if (r.to !== address) return false;
        if (new Date(r.created_at).getTime() <= sinceMs) return false;
        return asset === 'XLM' ? r.asset_type === 'native' : r.asset_code === asset;
      });
    }
    if (chain === 'bitcoin' && asset === 'BTC') {
      const res = await fetch(`https://mempool.space/api/address/${address}/txs`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const txs: any[] = await res.json();
      return txs.slice(0, 10).some(
        (tx) =>
          tx?.status?.confirmed &&
          (tx.status.block_time ?? 0) * 1000 > sinceMs &&
          (tx.vout ?? []).some((o: any) => o?.scriptpubkey_address === address && o?.value > 0)
      );
    }
  } catch {
    return null;
  }
  return null;
}
