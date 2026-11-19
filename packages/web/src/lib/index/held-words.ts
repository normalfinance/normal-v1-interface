import type { Translate } from '@/lib/flow/types';

import { listWords } from '@/lib/flow/plans';
import { assetName } from '@/lib/portfolio/asset-names';

import type { HeldReason } from './legs';

// ---------------------------------------------------------------------------
// What to tell the person about a coin of their index purchase that was not
// bought, and whether "Try again" can help. One wording for the buy page and
// the purchase details.
//
// Niko 2026-11-14 (a partner's Top 3): the page said "This did not go through"
// although Bitcoin and Ethereum had arrived, and gave a reason that was not
// the real one ("the exchange kept failing, its share is safe at your Base
// address") while the share was not there at all, so "Try again" could never
// work. The title now names the coin, the body says which coins were bought
// (their swap is out: "bought", not "arrived", since delivery can still be
// under way), and the reason decides between "try again" and "contact us".
// ---------------------------------------------------------------------------

export interface HeldWords {
  title: string;
  body: string;
  /** Trying again can buy the coin (its share is at the Base address). */
  canRetry: boolean;
}

export function heldWords(
  t: Translate,
  p: { coin: string; reason: HeldReason; bought: string[] }
): HeldWords {
  const coin = assetName(p.coin);
  const coins = listWords(t, p.bought.map(assetName));
  const bought =
    p.bought.length === 0
      ? ''
      : `${
          p.bought.length === 1
            ? t('{{coins}} was bought.', { coins })
            : t('{{coins}} were bought.', { coins })
        } `;

  if (p.reason === 'stellar') {
    return {
      title: t('{{coin}} was not bought', { coin }),
      body:
        bought +
        t(
          'The price of {{coin}} moved before its swap on Stellar, so the swap did not happen and its share stays as digital dollars in your Stellar wallet. You can swap them to {{coin}} on the Swap page.',
          { coin }
        ),
      canRetry: false,
    };
  }
  if (p.reason === 'missing') {
    return {
      title: t('{{coin}} was not bought', { coin }),
      body:
        bought +
        t(
          'When its turn came, its share was no longer at your Base address, so trying again cannot buy it. Contact us and we will sort it out.'
        ),
      canRetry: false,
    };
  }
  return {
    title: t('{{coin}} was not bought yet', { coin }),
    body:
      bought +
      t(
        'The exchange for {{coin}} kept failing, so its share is safe as digital dollars at your own Base address. You can try it again on another route.',
        { coin }
      ),
    canRetry: true,
  };
}
