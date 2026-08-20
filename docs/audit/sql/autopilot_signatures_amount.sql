-- #33 Stage 3 follow-up: USD amount per signed autopilot leg — powers the
-- D3 caps ($2k/tx is checked in code; the $10k/day rolling sum and the
-- 90-day idle expiry read THIS column). Additive + idempotent; safe to run
-- any time after autopilot_signatures.sql. Until it runs, the app still
-- works: audits fall back to the original shape and the daily sum reads 0
-- (per-tx cap + the Turnkey policy still bound every signature).
ALTER TABLE autopilot_signatures
  ADD COLUMN IF NOT EXISTS "amountUsd" DOUBLE PRECISION;
