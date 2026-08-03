// ---------------------------------------------------------------------------
// The chain registry: ONE description of every chain we support.
//
// Chains used to be four named fields (`bitcoinAddress`, `ethereumAddress`, …)
// spread across ~28 files, plus a separate asset→chain map, plus a closed
// union type on the send adapters. Adding one meant finding every place that
// had spelled the list out by hand. Everything derivable now derives from
// here — see docs/audit/34-chain-registry-plan.md.
//
// Adding an EVM chain (Avalanche, Base, Polygon…) is meant to be ONE entry:
// EVM addresses are chain-agnostic, so it reuses the existing Turnkey address
// and needs no database change. A non-EVM chain additionally needs its own
// send adapter, an activity source, a DB column, and — verify this first —
// Turnkey signing support for its curve/address format.
// ---------------------------------------------------------------------------

/** How a chain is signed and addressed. Drives which adapter can serve it. */
export type ChainKind = 'evm' | 'svm' | 'utxo' | 'stellar';

/** Column on TurnkeyWallet (and field on TurnkeyWalletInfo) holding the address. */
export type AddressField =
  | 'bitcoinAddress'
  | 'ethereumAddress'
  | 'solanaAddress'
  | 'stellarAddress';

export interface ChainDef {
  id: string;
  /** Native asset symbol. */
  symbol: string;
  name: string;
  kind: ChainKind;
  /** Native-asset decimals. */
  decimals: number;
  /**
   * Where this chain's address lives. Every EVM chain points at
   * `ethereumAddress` on purpose — one secp256k1 address is valid on all of
   * them, which is why an EVM chain needs no new address and no migration.
   */
  addressField: AddressField;
  /** Our own activity route, when the chain has one. */
  activityPath?: string;
  /** EVM chain id, for the chain-parameterised EVM signer. */
  evmChainId?: number;
  /** Circle CCTP domain, when the chain is bridgeable. */
  cctpDomain?: number;
  explorerTx: (hash: string) => string;
}

export const CHAINS = {
  bitcoin: {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    kind: 'utxo',
    decimals: 8,
    addressField: 'bitcoinAddress',
    activityPath: '/api/activity/bitcoin',
    explorerTx: (h: string) => `https://mempool.space/tx/${h}`,
  },
  ethereum: {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    kind: 'evm',
    decimals: 18,
    addressField: 'ethereumAddress',
    activityPath: '/api/activity/ethereum',
    evmChainId: 1,
    cctpDomain: 0,
    explorerTx: (h: string) => `https://etherscan.io/tx/${h}`,
  },
  solana: {
    id: 'solana',
    symbol: 'SOL',
    name: 'Solana',
    kind: 'svm',
    decimals: 9,
    addressField: 'solanaAddress',
    activityPath: '/api/activity/solana',
    cctpDomain: 5,
    explorerTx: (h: string) => `https://solscan.io/tx/${h}`,
  },
  stellar: {
    id: 'stellar',
    symbol: 'XLM',
    name: 'Stellar',
    kind: 'stellar',
    decimals: 7,
    addressField: 'stellarAddress',
    activityPath: '/api/activity/stellar',
    explorerTx: (h: string) => `https://stellar.expert/explorer/public/tx/${h}`,
  },
} as const satisfies Record<string, ChainDef>;

export type ChainId = keyof typeof CHAINS;

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export function getChain(id: ChainId): ChainDef {
  return CHAINS[id];
}

export function isChainId(value: string): value is ChainId {
  return value in CHAINS;
}

/** Chains of a given kind — e.g. every EVM chain for the shared signer. */
export function chainsOfKind(kind: ChainKind): ChainId[] {
  return CHAIN_IDS.filter((id) => CHAINS[id].kind === kind);
}

/** The chain a native asset symbol belongs to (BTC → bitcoin). */
export function chainForSymbol(symbol: string): ChainId | undefined {
  const upper = symbol.toUpperCase();
  return CHAIN_IDS.find((id) => CHAINS[id].symbol === upper);
}

/** Minimal shape we need: any object carrying the per-chain address fields. */
export type ChainAddresses = Partial<Record<AddressField, string | null>>;

/**
 * Read a chain's address without naming its field. This is the call that lets
 * consumers stop hardcoding `info.bitcoinAddress` — and the reason an EVM
 * chain added later resolves to the existing Ethereum address for free.
 */
export function getChainAddress(
  addresses: ChainAddresses | null | undefined,
  chainId: ChainId
): string | null {
  if (!addresses) return null;
  return addresses[CHAINS[chainId].addressField] ?? null;
}

/** Every chain the user currently has an address for. */
export function availableChains(addresses: ChainAddresses | null | undefined): ChainId[] {
  return CHAIN_IDS.filter((id) => !!getChainAddress(addresses, id));
}

/** Every address field the registry knows about (deduped — EVM chains share one). */
export const ADDRESS_FIELDS = Array.from(
  new Set(CHAIN_IDS.map((id) => CHAINS[id].addressField))
) as AddressField[];

/**
 * Prisma `select` fragment for the address columns, so queries don't list them
 * by hand: `select: { subOrgId: true, ...ADDRESS_SELECT }`.
 */
export const ADDRESS_SELECT = Object.fromEntries(
  ADDRESS_FIELDS.map((f) => [f, true])
) as Record<AddressField, true>;

/** Pull just the address fields off a wallet row, for API responses. */
export function pickAddresses(row: ChainAddresses | null | undefined): Record<AddressField, string | null> {
  return Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, row?.[f] ?? null])) as Record<
    AddressField,
    string | null
  >;
}
