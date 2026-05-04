/**
 * Normalize the result from different wallet signing implementations.
 * Wallets return different shapes: plain string, { signedXDR }, { signedXdr }, { xdr }, etc.
 */
export function normalizeSignedXDR(result: any): string | null {
  if (typeof result === 'string' && result.length > 0) return result;
  return (
    result?.signedXDR ??
    result?.signedXdr ??
    result?.xdr ??
    result?.result?.signedXDR ??
    result?.result?.signedXdr ??
    null
  );
}
