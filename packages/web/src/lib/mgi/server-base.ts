// SERVER-ONLY: base URL for MoneyGram's Stellar Anchor Platform API.
//
// MoneyGram retired the legacy adapter on 2026-07-19:
//   old: (ext)stellar.moneygram.com/stellaradapterservice
//   new: (ext)mgxanchor.moneygram.com/stellarsepservice
// MGI_ACCESS_HOST carries only the host (extmgxanchor.moneygram.com in test,
// mgxanchor.moneygram.com in prod). The path segment lives here — verified
// against their stellar.toml (WEB_AUTH_ENDPOINT / TRANSFER_SERVER_SEP0024) —
// so a future platform move is a one-line change instead of a hunt across
// every /api/mgi route.
export function mgiApiBase(): string | null {
  const host = process.env.MGI_ACCESS_HOST?.trim();
  return host ? `https://${host}/stellarsepservice` : null;
}
