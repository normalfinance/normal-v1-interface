// ---------------------------------------------------------------------------
// Push notifications — shared shapes. Pure types, importable anywhere.
//
// The `data` union is the contract with the mobile app (2026-09-16): it
// routes `cctp` to the swap-run screen by transferId and `lifi`/`send` to
// Activity. Add a member here and in the app together.
// ---------------------------------------------------------------------------

export type PushPlatform = 'ios' | 'android';
export type PushAppVariant = 'dev' | 'prod';

export const PUSH_PLATFORMS: readonly PushPlatform[] = ['ios', 'android'];
export const PUSH_APP_VARIANTS: readonly PushAppVariant[] = ['dev', 'prod'];

export type PushData =
  | { type: 'cctp'; transferId: string; status: 'completed' | 'refunded' | 'failed' }
  | { type: 'lifi'; txHash: string; status: 'DONE' | 'REFUNDED' | 'FAILED' }
  | { type: 'send'; txHash: string; chain: string; status: 'confirmed' | 'failed' };

export interface PushPayload {
  title: string;
  body: string;
  data: PushData;
}

/** What a provider said about one delivery attempt. */
export type PushDeliveryResult =
  | { ok: true }
  | { ok: false; kind: 'invalid_token'; reason: string }
  | { ok: false; kind: 'transient' | 'config'; reason: string };
