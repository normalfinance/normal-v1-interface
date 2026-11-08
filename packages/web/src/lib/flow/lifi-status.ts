import { parseDeliveredAmount } from '@/lib/cctp/delivered-amount';

// ---------------------------------------------------------------------------
// What a bridge is doing with the money, read from LI.FI's status for the
// transaction that handed it over (GET /api/lifi/status → { status }).
//
// LI.FI reports a status and a substatus. The ones that tell us where the
// money is:
//   PENDING  WAIT_SOURCE_CONFIRMATIONS     the bridge has it, waiting for the
//                                          sending network to confirm
//   PENDING  WAIT_DESTINATION_TRANSACTION  the bridge is sending the coin out
//   PENDING  REFUND_IN_PROGRESS            the bridge is sending it back
//   DONE     COMPLETED                     it arrived (receiving.txHash)
//   DONE     REFUNDED | PARTIAL            returned (same verdict the rest of
//                                          the app uses: lib/cctp/lifi-verdict)
//   FAILED / INVALID                       it failed
// Anything else is "still on its way" with no finer detail. Pure, so the
// screen and the tests read it the same way.
// ---------------------------------------------------------------------------

export type BridgePhase =
  | 'unknown'
  | 'source'
  | 'sending'
  | 'refunding'
  | 'waiting'
  | 'delivered'
  | 'refunded'
  | 'failed';

export interface BridgeProgress {
  phase: BridgePhase;
  /** The transaction that delivered the coin, once the bridge sent it. */
  receivingTxHash: string | null;
  /** The LI.FI chain id it arrived on. */
  receivingChainId: number | null;
  /** The amount that arrived, in coins, when LI.FI reports one we can trust. */
  deliveredAmount: string | null;
}

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export function readBridgeStatus(status: unknown): BridgeProgress {
  const s = (status ?? {}) as {
    status?: unknown;
    substatus?: unknown;
    receiving?: { txHash?: unknown; chainId?: unknown; amount?: unknown; token?: unknown };
  };
  const st = String(s.status ?? '').toUpperCase();
  const sub = String(s.substatus ?? '').toUpperCase();
  const receiving = s.receiving && typeof s.receiving === 'object' ? s.receiving : null;
  const receivingTxHash = asString(receiving?.txHash);
  const chainId = Number(receiving?.chainId);

  const base = {
    receivingTxHash,
    receivingChainId: Number.isFinite(chainId) && chainId > 0 ? chainId : null,
    deliveredAmount: null as string | null,
  };

  if (st === 'DONE') {
    if (sub === 'REFUNDED' || sub === 'PARTIAL') return { ...base, phase: 'refunded' };
    return {
      ...base,
      phase: 'delivered',
      deliveredAmount: parseDeliveredAmount(
        receiving as Parameters<typeof parseDeliveredAmount>[0]
      ),
    };
  }
  if (st === 'FAILED' || st === 'INVALID') return { ...base, phase: 'failed' };
  if (st === 'PENDING') {
    if (sub === 'WAIT_SOURCE_CONFIRMATIONS') return { ...base, phase: 'source' };
    if (sub === 'WAIT_DESTINATION_TRANSACTION') return { ...base, phase: 'sending' };
    if (sub === 'REFUND_IN_PROGRESS') return { ...base, phase: 'refunding' };
    return { ...base, phase: 'waiting' };
  }
  return { ...base, phase: 'unknown' };
}

/** A bridge's name for people: LI.FI's own display name, else a tidy key. */
const KNOWN_TOOLS: Record<string, string> = {
  relay: 'Relay',
  relaydepository: 'Relay',
  chainflip: 'Chainflip',
  thorchain: 'THORChain',
  mayan: 'Mayan',
  mayanmctp: 'Mayan',
  near: 'NEAR Intents',
  across: 'Across',
  stargatev2: 'Stargate',
  stargatev2bus: 'Stargate',
  symbiosis: 'Symbiosis',
  allbridge: 'Allbridge',
  gaszipbridge: 'Gas.zip',
  squid: 'Squid',
  cbridge: 'cBridge',
  hop: 'Hop',
  garden: 'Garden',
  glacis: 'Glacis',
  celercircle: 'Circle',
  eco: 'Eco',
};

export function bridgeName(quote: unknown): string {
  const q = (quote ?? {}) as { tool?: unknown; toolDetails?: { name?: unknown } };
  const named = asString(q.toolDetails?.name);
  if (named) return named;
  const key = asString(q.tool);
  if (!key) return 'The exchange';
  const known = KNOWN_TOOLS[key.toLowerCase()];
  if (known) return known;
  return key.charAt(0).toUpperCase() + key.slice(1);
}
