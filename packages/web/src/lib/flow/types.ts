// ---------------------------------------------------------------------------
// One model for every money movement the app runs: a savings deposit or
// withdrawal, a Stellar swap, a cross-chain swap, a swap over Circle's bridge.
//
// A flow is a JOURNEY: the places the money can be (your wallet, Circle, an
// exchange, your other wallet) with the steps between them. Each step says
// where the money is while it runs, so the screen can always answer the one
// question people actually have: "where is my money right now?"
//
// Pure data. The plans are built in ./plans.ts, the live state in ./run.ts,
// and the screen is components/_common/flow.
// ---------------------------------------------------------------------------

export type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** A place the money can be. */
export interface FlowPlace {
  id: string;
  /** In plain words: "Your Stellar wallet", "Circle", "Chainflip". */
  label: string;
  /** A second line: what the place is, or its address. */
  detail?: string;
  /** The coin the money is held as there, for its icon. */
  asset?: string;
  /** The network a wallet is on; USDC on Stellar wears the Stellar badge. */
  network?: 'stellar' | 'bitcoin' | 'ethereum' | 'solana' | 'base';
  /** A place that is a service, not a wallet: its grey icon. */
  glyph?: 'vault' | 'bridge' | 'exchange' | 'wallets';
  /** How much is there when the money arrives: "25.00 USDC", "≈ 0.00029 BTC". */
  amount?: string;
  /** An address only the person controls. */
  own?: boolean;
  /** Mono text after the detail: a shortened address. */
  address?: string;
  /** The address on its explorer. */
  href?: string;
}

/** Who carries out a step, shown beside it. Already in words: "You", "Circle". */
export type FlowActor = string;

export interface FlowStepDef {
  id: string;
  title: string;
  detail: string;
  actor: FlowActor;
  /**
   * Where the money is while the step runs. 'here': still at the place above
   * it. 'moving': on its way to the next place below.
   */
  money: 'here' | 'moving';
  /** How long it usually takes: "Seconds", "About 15 minutes". */
  eta?: string;
  /** Why the step might not happen this time: "First time only". */
  optional?: string;
  /** The person approves it (passkey or wallet prompt). */
  signature?: boolean;
}

export type FlowItem = { kind: 'place'; place: FlowPlace } | { kind: 'step'; step: FlowStepDef };

export interface FlowPlan {
  items: FlowItem[];
}

/** One line of the summary beside the steps. */
export interface FlowSummaryRow {
  key: string;
  label: string;
  value: string;
  /** A second line under the value: the dollar value, an explanation. */
  detail?: string;
  /** Mono for addresses. */
  mono?: boolean;
  /** Draws attention (a high network fee). Amber, never red. */
  caution?: boolean;
}

export interface FlowSummary {
  rows: FlowSummaryRow[];
  /** Words under the rows: what the person agrees to. */
  note?: string;
}

// ---- live state ------------------------------------------------------------

export type StepStatus = 'upcoming' | 'active' | 'done' | 'skipped' | 'failed' | 'stopped';

export interface StepLink {
  label: string;
  href: string;
}

export interface StepState {
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
  /** What is happening right now, or what happened: "Ledger 51,234,567". */
  note?: string;
  links?: StepLink[];
  /** A prompt is open: the step is waiting on the person. */
  waiting?: boolean;
}

/**
 * review     nothing has happened; the person is reading the plan
 * running    the steps are under way
 * done       every step finished
 * failed     a step failed (error says what, and where the money is)
 * stopped    it ended early and nothing is wrong (a bridge refunded): ending
 * handed-off this page's part is over and Normal finishes the rest: ending
 */
export type RunPhase = 'review' | 'running' | 'done' | 'failed' | 'stopped' | 'handed-off';

export interface RunState {
  phase: RunPhase;
  steps: Record<string, StepState>;
  activeId: string | null;
  startedAt: number | null;
  endedAt: number | null;
  error: string | null;
  ending: string | null;
}

/** Where the money is, read off the plan and the run. */
export interface MoneyPosition {
  placeId: string;
  /** On its way from `placeId` to `toPlaceId`. */
  moving: boolean;
  toPlaceId: string | null;
}
