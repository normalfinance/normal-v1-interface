-- #33 Stage 3: autopilot signing audit trail (additive — run in Supabase).
-- Every autopilot signature attempt is recorded: who (sub-org + address),
-- what for, and how it ended. The app inserts via raw SQL and tolerates the
-- table's absence, so this can be applied any time before go-live.
CREATE TABLE IF NOT EXISTS autopilot_signatures (
  id          BIGSERIAL PRIMARY KEY,
  "subOrgId"  TEXT NOT NULL,
  "signWith"  TEXT NOT NULL,
  "purpose"   TEXT NOT NULL,
  "outcome"   TEXT NOT NULL,      -- signed | failed | refused-disabled
  "detail"    TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS autopilot_signatures_suborg_idx
  ON autopilot_signatures ("subOrgId", "createdAt");
