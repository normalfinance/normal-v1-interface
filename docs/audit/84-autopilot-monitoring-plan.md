# 84 — Autopilot monitoring: plan

Status: **PROPOSED — awaiting GO.** No code written.
Branch: **`feat/autopilot-monitoring`** (off `develop`).
Follows doc 76 §4 (the caps reversal) and doc 82 §9.3.

---

## 1. Why this exists

The autopilot is a key **on our server** that can sign Base transactions on
behalf of any user who turned on one-signature swaps.

On 2026-08-24 we removed its value caps ($2k per transaction, $10k per day) at
Niko's request, so a user can move $100k in a day without extra signatures.
That was a deliberate product call. It also removed the last thing bounding
*value* if that key ever leaked, because:

- the Turnkey policy restricts **which contracts** may be called
- it **cannot read inside LI.FI calldata**, so it cannot pin **where funds land**
- our own route pins the destination — and a stolen key skips our route

We therefore traded **prevention** for **detection**. This document is the
detection, which does not exist yet.

Every autopilot signature is already written to `autopilot_signatures`.
**Nobody has ever read it.** Removing the spending limit on a company card is
a reasonable decision; not reading the statement afterwards is not.

## 2. What we already have

| Piece | State |
|---|---|
| `autopilot_signatures` table | Live. Records `subOrgId`, `signWith`, `purpose`, `outcome`, `amountUsd`, `createdAt` on every attempt |
| `outcome` values | `signed`, `refused-cap`, `refused-expired`, `refused-disabled`, `failed` |
| Cron infrastructure | Vercel crons in `packages/web/vercel.json`, three jobs, each protected by `CRON_SECRET` |
| Cron heartbeats | `cron-heartbeat.ts` stamps `cron:heartbeat:<name>` in Redis on every run |
| Kill switch | `AUTOPILOT_DISABLED=1` + deploy stops all autopilot signing |
| **Somewhere to send an alert** | **Nothing.** Everything goes to `logger`, which nobody watches at 3am |

Note the pattern: the heartbeats have the same shape of gap as the signature
table. The data is recorded faithfully and **read by no one**. Recording is
not monitoring.

## 3. What I want to build

### 3.1 An alert job (the substance)

A new cron route, `/api/cron/autopilot-watch/`, running every 15 minutes,
`CRON_SECRET`-protected and heartbeat-stamped like the others. It reads the
last window from `autopilot_signatures` and raises an alert on:

| Signal | Why it matters |
|---|---|
| A single `signed` leg above `AUTOPILOT_ALERT_TX_USD` | The thing the per-transaction cap used to prevent. Now we watch it instead |
| More than N `refused-*` rows in the window | What probing a stolen key looks like: repeated attempts bouncing off the policy |
| Total `signed` USD in an hour above `AUTOPILOT_ALERT_HOURLY_USD` | Catches many small legs, which no per-transaction threshold would see |
| Any `failed` outcome | Should be rare; a burst means Turnkey or our signer is unwell |

Thresholds come from env, so tuning needs no deploy. Unset = that signal is
off, matching how the caps now work.

### 3.2 A delivery channel

Without one, an alert job is another table nobody reads. Recommendation: a
**Discord webhook** (`ALERT_WEBHOOK_URL`) — you already run a Discord, it is
one `fetch`, no vendor, no account, and the message can carry the numbers
directly. A thin `lib/alerts.ts` wrapper means the channel can change later
without touching the job.

The wrapper must be **best-effort**: an alert that throws must never break the
cron run that noticed the problem.

### 3.3 A kill-switch drill

`AUTOPILOT_DISABLED=1` already works, but nobody has ever pulled it. The
deliverable is not code: set it on staging, confirm swaps fall back to normal
prompts, unset it, and write down in the runbook **who can do this and how
long it takes**. A lever nobody has tested is a lever you do not know you have.

## 4. Key rotation — correcting the record

Doc 82 §9.3 says to rotate `AUTOPILOT_API_PRIVATE_KEY` on a schedule and that
the policy survives because it keys on the user id. **The second half is true;
the first half is not, and I wrote it before checking.**

Reading `autopilot-consent.ts`: our public key is registered as an API key on
a `Normal Autopilot` user created **inside each consenting user's own
sub-organization**, and that creation is **stamped by that user's passkey**.

Consequences, plainly:

- the key is not in one place — it is in **every consenting user's sub-org**
- changing it means mutating those sub-orgs
- sub-org mutations require the **user's passkey**, which we do not have and
  cannot obtain
- therefore **rotation is not a runbook, it is a migration**: every consenting
  user would have to re-consent

**So if that key leaks, the remedy is the kill switch, not rotation.** That is
precisely why §3.1 and §3.3 matter more than they first appear.

**Worth designing, not now:** register **two** API keys at consent time — one
current, one spare — so a single emergency rotation needs no user action. It
buys exactly one rotation, which is the difference between "kill the feature
for everyone" and "swap the key" on a bad day. It costs nothing at consent
time and can be added to the ceremony whenever we next touch it.

## 5. Decisions I need

1. **Channel.** Discord webhook (recommended), or something you already watch?
   An alert nobody sees is worse than none, because it feels like coverage.
2. **Thresholds.** My starting suggestion: alert on any single leg over
   **$5,000**, on more than **10** refusals in 15 minutes, and on more than
   **$25,000** signed in an hour. These are starting points to tune from, not
   limits — nothing is blocked, only reported.
3. **Should the same job watch the relayer float?** The CCTP relayer pays gas
   for top-ups and nothing watches its balance either. Same shape of problem,
   same job, small addition. I would include it.

## 6. Tests

- **Pure:** the threshold decisions (single leg, refusal count, hourly total)
  as a function of rows in a window — including that an unset threshold means
  "off", never "zero", the same trap the caps had
- **Route:** the cron rejects a wrong `CRON_SECRET`, and a throwing alert
  channel does not fail the run
- **Manual:** set `AUTOPILOT_ALERT_TX_USD=1` on staging, do a small swap with
  autopilot on, and confirm an alert arrives with the right amount

## 7. Risk

Low: the job only reads and reports, and blocks nothing. The realistic failure
is **noise** — a threshold set too low trains everyone to ignore the channel,
which is worse than silence. Hence env-tunable thresholds, and starting
deliberately high.

## 8. Sizing

**S–M.** One cron route, one alert wrapper, one `vercel.json` entry, plus the
drill and the runbook note. The relayer-float check adds little if included.

---

# Outcome — detection shipped, channel pending (2026-08-24)

Built on `feat/autopilot-monitoring` while the Discord decisions are still with
the team. Everything the team has to answer is **configuration**, so none of it
blocked the code.

## What landed

- `server/autopilot-watch.ts` — the rules, pure: a single large signed leg, a
  cluster of refusals, an unusual hour of volume, any signing failure, and the
  relayer gas float. 14 tests.
- `server/alerts.ts` — the only module that knows what a webhook is. With
  `ALERT_WEBHOOK_URL` unset, findings go to the log and callers behave
  identically; setting it later needs no code change.
- `api/cron/autopilot-watch/` — every 15 minutes, `CRON_SECRET`-protected,
  heartbeat-stamped, registered in `vercel.json`. Reports its own delivery
  state (`webhook` / `log-only`) so a run cannot look healthy while nobody is
  being told.
- Redis cooldowns per finding, so a low float reports once every six hours
  rather than every fifteen minutes. Redis failure fails OPEN: a missed
  suppression is noise, a missed alert is the thing we are preventing.

## Two things worth recording

1. **The conformance guard did its job.** The new cron route failed
   `route-auth-conformance.test.ts` on the run that added it — exactly the
   "born public" class of bug that test exists to stop. Allowlisted with a
   reason, as the guard demands.
2. **`capEnabled` is now shared** with the caps module, so "an unset limit
   means OFF, never zero" has one definition. A threshold of zero would alert
   on everything and earn the channel a permanent mute on day one.

## Still open

- The three team decisions (channel layout, thresholds, whether to watch the
  float) — all env, no code.
- The kill-switch drill: `AUTOPILOT_DISABLED=1` works but has never been
  pulled deliberately, and a lever nobody has tested is not a lever.
- Key rotation remains **impossible** without every consenting user
  re-consenting (§4). That is unchanged and still the reason this job matters.
