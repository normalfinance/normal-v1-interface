-- Re-provision a Turnkey wallet whose passkey became unusable.
--
-- WHEN: the user's device can no longer produce the credential registered to
-- their sub-org (lost device, an orphaned passkey, a browser wiped). Signing
-- is impossible, so ANY funds on that sub-org are unrecoverable — this script
-- does not rescue them, it lets the same account start over.
--
-- WHY A DELETE: POST /api/turnkey/wallet is idempotent on supabaseUid, so
-- while the row exists the app keeps handing back the dead sub-org. The
-- Turnkey sub-org itself CANNOT be deleted — that is a root-quorum activity
-- needing the very passkey we no longer have — so it is abandoned in place.
--
-- BEFORE RUNNING: check every chain on the row, not just Stellar. An address
-- column that is NULL was never provisioned and holds nothing.

-- 1) Look at exactly what will go. Expect ONE row; read the addresses out and
--    check their balances before continuing.
SELECT "supabaseUid", "subOrgId", "walletId", "createdAt",
       "stellarAddress", "bitcoinAddress", "ethereumAddress", "solanaAddress"
FROM turnkey_wallets
WHERE "subOrgId" = '<SUB_ORG_ID>';

-- 2) Delete it. Keyed on subOrgId (unique) rather than supabaseUid so a typo
--    matches nothing instead of the wrong person's wallet. Expect: DELETE 1.
DELETE FROM turnkey_wallets
WHERE "subOrgId" = '<SUB_ORG_ID>';

-- 3) Confirm it is gone (expect 0 rows).
SELECT count(*) FROM turnkey_wallets WHERE "subOrgId" = '<SUB_ORG_ID>';

-- AFTER: the user clears localStorage key 'nf:turnkey-addresses:v1' (or just
-- reloads — the cache is overwritten by the first server response saying the
-- wallet is gone), then creates the wallet again from the app. A NEW passkey
-- and a NEW sub-org are minted; the sub-org name carries a timestamp suffix
-- so re-provisioning the same uid cannot collide with the abandoned one.
