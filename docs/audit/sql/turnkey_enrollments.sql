-- Phone-side passkey enrolment via email OTP — audit trail, additive.
--
-- WHY: until 2026-09-14 a wallet had exactly one passkey and no way to add
-- another, so a passkey created in Chrome on Windows could never reach the
-- user's phone. Justin approved Turnkey's email-OTP flow for enrolling a new
-- device: the phone proves it holds a code sent to the account email, gets a
-- 15-minute session on the user's OWN sub-org, and uses it once to register
-- its passkey (api/turnkey/enroll/*). That makes "inbox + Normal login" enough
-- to add a passkey — a deliberate custody change — so every step is recorded
-- here with ip/ua, and an incident can be reconstructed from this table.
--
-- step: 'init' | 'verify' | 'login' | 'complete' | 'refused'
--
-- SAFE TO RE-RUN.

CREATE TABLE IF NOT EXISTS turnkey_enrollments (
  id            TEXT PRIMARY KEY,
  "supabaseUid" TEXT NOT NULL,
  "subOrgId"    TEXT NOT NULL,
  step          TEXT NOT NULL,
  "otpId"       TEXT,
  detail        TEXT,
  ip            TEXT,
  "userAgent"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS turnkey_enrollments_supabaseUid_idx ON turnkey_enrollments ("supabaseUid");
CREATE INDEX IF NOT EXISTS turnkey_enrollments_otpId_idx ON turnkey_enrollments ("otpId");
