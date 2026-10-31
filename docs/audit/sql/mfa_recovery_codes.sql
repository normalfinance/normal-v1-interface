-- Two-factor recovery codes — one-time codes for someone who lost their
-- authenticator, additive.
--
-- WHY: Supabase stores the 2FA secret but the auth-js we run has no recovery
-- codes, so these are ours. Using one removes 2FA from the account
-- (api/auth/two-factor/recover). Only a SHA-256 hash is stored: the codes carry
-- 80 random bits and are shown to the person once.
--
-- ROW LEVEL SECURITY is on with no policies, on purpose. This table is in
-- `public`, which Supabase exposes through its REST API to anyone holding the
-- publishable key, and the bulk RLS fix of 2026-10-03 only covered tables that
-- existed then. The app connects as `postgres`, which is not restricted by RLS.
--
-- SAFE TO RE-RUN.

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id            TEXT PRIMARY KEY,
  "supabaseUid" TEXT NOT NULL,
  "codeHash"    TEXT NOT NULL,
  "usedAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS mfa_recovery_codes_supabaseUid_idx ON mfa_recovery_codes ("supabaseUid");

ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
