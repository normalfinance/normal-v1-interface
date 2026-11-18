import type { LifiQuote } from '@/lib/lifi/execute';

export type QuoteFetch =
  | { ok: true; quote: LifiQuote; feePercent: number }
  | { ok: false; error: unknown };

/**
 * One way to ask /api/lifi/quote for a price, shared by the card (as the
 * amount is typed) and the moment of signing (Doc 95 Wave 6): both engines
 * fetch again there when the quote on screen is too old, with exactly the
 * same request. Started in the LI.FI engine; the Circle engine uses it since
 * 2026-11-09, when an old Solana quote failed to send.
 */
export async function requestLifiQuote(
  body: Record<string, unknown>,
  opts: { signal?: AbortSignal; cancelled?: () => boolean } = {}
): Promise<QuoteFetch> {
  let res: Response | null = null;
  let data: any = null;
  // Doc 90 W4: 429 and 5xx answers are passing, so one quiet retry before
  // the card shows an error.
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch('/api/lifi/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body: JSON.stringify(body),
    }).catch(() => null);
    data = res ? await res.json().catch(() => null) : null;
    if (opts.cancelled?.()) return { ok: false, error: null };
    if (res && res.ok && data?.success) break;
    const transient = !res || res.status === 429 || res.status >= 500;
    if (!transient || attempt === 1) break;
    await new Promise((r) => setTimeout(r, 6_000));
    if (opts.cancelled?.()) return { ok: false, error: null };
  }
  if (!res || !res.ok || !data?.success) return { ok: false, error: data?.error ?? null };
  return {
    ok: true,
    quote: data.quote as LifiQuote,
    feePercent: typeof data.feePercent === 'number' ? data.feePercent : 0,
  };
}
