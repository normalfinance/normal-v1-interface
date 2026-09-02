// ---------------------------------------------------------------------------
// Sanitizer for the integrator fee reported to /api/lifi/record (doc 123).
// The record is the swap's ONLY activity row (doc 90 W2), so a bad fee value
// must degrade to "no fee recorded" — never fail the record.
// ---------------------------------------------------------------------------

// A fee above 10% of the source amount cannot be our 0.5% integrator fee —
// it is corrupt input and gets dropped rather than poisoning revenue charts.
const MAX_FEE_FRACTION = 0.1;

/** Returns the canonical fee string to store, or null when the value is
 *  absent, unparsable, non-positive, or implausibly large. */
export function sanitizeRecordedFee(feeAmount: unknown, amountIn: unknown): string | null {
  if (feeAmount === undefined || feeAmount === null) return null;
  const fee = Number(feeAmount);
  if (!Number.isFinite(fee) || fee <= 0) return null;
  const amount = Number(amountIn);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (fee > amount * MAX_FEE_FRACTION) return null;
  return String(fee);
}
