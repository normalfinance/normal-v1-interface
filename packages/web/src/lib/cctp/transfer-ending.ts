import type { Translate } from '@/lib/flow/types';

import { assetNoun } from '@/lib/portfolio/asset-names';
import { friendlyAppError } from '@/utils/errors/error-classifier';

// ---------------------------------------------------------------------------
// How a finished transfer ended, in words a person reads (Niko 2026-11-09: no
// confusing errors ever, and a way out for every one). The server writes
// `errorDetail` for its own logs and for support ("Source swap refunded: funds
// returned to the sender; nothing was bridged", "Expired: no transaction was
// ever sent; no funds moved", raw exceptions); the Activity details used to
// print it as it was, in red, even when nothing was lost. Pure, so it is tested.
// ---------------------------------------------------------------------------

export type EndingKind =
  /** The exchange sent the coin back to the wallet it came from. */
  | 'sent-back'
  /** Nothing left the person's wallet: turned down on-chain, never sent, cancelled. */
  | 'not-sent'
  /** The digital dollars are on their way back to Stellar ("Bring back as USDC"). */
  | 'coming-back'
  /** Something went wrong that the person may need to act on. */
  | 'failed';

export interface TransferEnding {
  kind: EndingKind;
  /** Calm endings are grey with nothing lost; only `failed` is red. */
  calm: boolean;
  /** What happened and what to do next, in plain words. */
  text: string;
}

export function transferEnding(
  t: Translate,
  tr: { status: string; errorDetail: string | null; srcAsset: string }
): TransferEnding | null {
  const detail = (tr.errorDetail ?? '').trim();
  const coin = assetNoun(tr.srcAsset);

  if (/^Source swap refunded/i.test(detail)) {
    return {
      kind: 'sent-back',
      calm: true,
      text: t(
        'The exchange could not complete the swap and sent your {{coin}} back to your wallet. Nothing was lost, and you can start a new swap.',
        { coin }
      ),
    };
  }
  if (/^Source transaction reverted/i.test(detail)) {
    return {
      kind: 'not-sent',
      calm: true,
      text: t(
        'The exchange turned this swap down, so your {{coin}} never left your wallet. Only the small network fee was spent. You can start a new swap.',
        { coin }
      ),
    };
  }
  if (
    /^Expired: no transaction was ever sent/i.test(detail) ||
    /^Cancelled before any transaction was sent/i.test(detail)
  ) {
    return {
      kind: 'not-sent',
      calm: true,
      text: t('This swap was never sent, so nothing moved. You can start a new one.'),
    };
  }
  // The server's own plain words for a Stellar transfer that never landed
  // (lib/cctp/stellar-burn-verdict.ts): already for people, and calm.
  if (/never left your wallet/i.test(detail)) {
    return { kind: 'not-sent', calm: true, text: detail };
  }
  if (tr.status === 'REFUNDED') {
    return {
      kind: 'coming-back',
      calm: true,
      text: t(
        'The swap could not finish, so your digital dollars went back to your Stellar wallet. That trip has its own line in Activity.'
      ),
    };
  }
  if (tr.status !== 'FAILED') return null;
  // Anything else is a real failure: the classifier's words, which always end
  // with what to do (try again, or contact support).
  return {
    kind: 'failed',
    calm: false,
    text: detail ? friendlyAppError(detail) : friendlyAppError(''),
  };
}
