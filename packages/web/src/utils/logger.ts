// ---------------------------------------------------------------------------
// Dev-gated logger, dependency-free ON PURPOSE.
//
// Identical behavior to `logger` in @normalfinance/utils (every method is a
// no-op unless NODE_ENV === 'development'), but importing THAT one pulls the
// whole utils barrel — @stellar/stellar-sdk, ESM-only packages — into any
// module that just wants to log. That graph broke three jest suites the day
// the console-hygiene sweep added the import to small pure modules
// (passkey-stamper, wallet-kit-guard, webauthn-guard), and it bloats client
// bundles the same way. Light modules import from here; modules already on
// the barrel for other reasons may keep using the utils logger — the two are
// behaviorally identical.
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: isDev ? console.log : () => {},
  error: isDev ? console.error : () => {},
  warn: isDev ? console.warn : () => {},
  info: isDev ? console.info : () => {},
  debug: isDev ? console.debug : () => {},
};
