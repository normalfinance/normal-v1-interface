// ---------------------------------------------------------------------------
// The Bitcoin an address holds, as the wallet shows it (Niko 2026-11-10: a
// swap's Bitcoin still showed in Assets after it was sent, as if it could be
// swapped again, until the network confirmed the payment).
//
// mempool.space (Esplora) answers with two ledgers per address: chain_stats
// (confirmed) and mempool_stats (sent or received, not yet confirmed). A
// payment out leaves at once: its inputs are already spent. Our own sends
// (send-adapters/bitcoin.ts, build-btc-tx) never pick them again: the UTXO
// list they read drops outputs a pending payment spends (mempool/electrs
// query.rs `utxo`: `utxos.retain(|utxo| !mempool.has_spend(..))`, read
// 2026-11-10). A swap's coins are picked by LI.FI, from its own view. The
// change comes back in the same pending ledger, so the net is exactly what
// left: the amount and its fee. A payment IN counts once it is confirmed, as
// before: until then its sender can still replace it.
//
// The one blend: a pending payment in and out at once. The pending net is
// then counted only if it is a loss, so the balance never runs ahead of what
// is confirmed, and is at worst low until the payment in confirms.
// ---------------------------------------------------------------------------

export interface EsploraAddressStats {
  chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
  mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
}

/** Satoshis: confirmed, less what a pending payment out has already spent. */
export function btcBalanceSats(stats: EsploraAddressStats): number {
  const confirmed =
    (stats.chain_stats?.funded_txo_sum ?? 0) - (stats.chain_stats?.spent_txo_sum ?? 0);
  const pending =
    (stats.mempool_stats?.funded_txo_sum ?? 0) - (stats.mempool_stats?.spent_txo_sum ?? 0);
  return confirmed + Math.min(0, pending);
}
