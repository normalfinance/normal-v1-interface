import { cdn } from '@/utils/cdn';

// ----------------------------------------------------------------------

/**
 * The ways money comes in, as the app's Add money lists them
 * (components/_common/onramp-dialog.tsx): the same partners, the same words.
 * Shown by What you can do (Cash to crypto) and How it works (Add money).
 */
export const RAMPS = [
  { name: 'MoneyGram', detail: 'Cash at a location', icon: cdn('icons/moneygram/mgi.webp') },
  { name: 'Stripe', detail: 'Card or bank', icon: '/marketing/providers/stripe.svg' },
  { name: 'Coinbase', detail: 'Card or bank', icon: '/marketing/providers/coinbase.png' },
] as const;
