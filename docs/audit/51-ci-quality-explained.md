# 51 — The safety-net work, explained

Companion to [50-ci-and-withauth-plan.md](50-ci-and-withauth-plan.md) (the
decisions and inventories). This explains the same work from scratch: what was
broken, what changed, and why each piece matters. Nothing here changed what
users see — all of it changes how safely we can keep shipping.

---

## 1. The discovery: our safety net was lying on the floor

The repo has had a CI pipeline (`web-ci.yml`) for months: on every push it was
supposed to check formatting, lint, types and the build. Sounds great.

Reality, verified through GitHub's API: **it had failed 40 out of the last 40
runs**, going back to at least July 25 — possibly forever. And the failure
worked like this: every run died at step one (Prettier, 321 unformatted
files), and when a CI step fails, GitHub **skips** everything after it. So
ESLint, TypeScript and the build were not failing.

**They were never running at all.**

Nobody noticed, because red that stays red becomes wallpaper. This is the
single most important lesson in this document: *a check that is always red
protects nothing — it trains people to ignore checks.* The July accident
where working code vanished in a merge (section 6) happened while this net
was, in theory, deployed.

## 2. Resurrecting CI: green first, strict second

The rule for the fix: **CI must not be born red.** Every step was run locally
first; only steps proven green became blocking. Two couldn't honestly block
yet, and each carries a dated comment saying exactly why and what unlocks it:

- **Prettier — non-blocking for now.** Fixing it means reformatting 321 files
  in one commit. Dropped into the middle of the merge-conflict mess (section
  6), that commit would have been a bomb. It's scheduled for right after the
  merge policy settles; then the step flips back to blocking.
- **The build — non-blocking for now.** `next build` imports every API route,
  and some modules read secrets at import time (the rate limiter constructs
  its Redis client from env). On a CI machine with no secrets, that explodes
  regardless of code health. Vercel builds every push *with* real env, so it
  is the honest build gate today. Adding the secrets in repo settings unlocks
  this step.

What DOES block now: **ESLint, TypeScript, and the unit tests** — the gates
that catch real regressions. Plus quality-of-life: CI runs on pull requests,
duplicate runs get cancelled, and the i18n steps are gone (section 5).

## 3. withAuth: authentication as the default, not a memory test

Three separate security findings in this project were the same bug wearing
different clothes: an API route anyone on the internet could call, because in
Next.js every route is **born public** and a human must remember to add the
auth check. Humans forget. Three times, that we know of.

The fix inverts the default. A route is now written:

```ts
export const POST = withAuth(async (request, { user }) => { ... });
```

The check runs before the route's code ever executes; the verified user
arrives as an argument. Forgetting authentication is no longer possible —
and a route WITHOUT the wrapper now looks visibly different, which is what a
reviewer should have to notice. Unit tests pin the load-bearing promise: the
handler is never invoked without a user.

Three routes use it today (the newest ones). The remaining ~34 migrate in one
mechanical sweep — deliberately scheduled *after* the merge policy fix,
because a 37-file diff during the conflict period would have been reckless.

Bonus from the route-by-route inventory: five routes turned out to have
neither auth NOR rate limiting — including two that expose our DeFindex API
key to anonymous callers. Registered as finding #50, scheduled.

## 4. Lint zero: warnings are now signal, not noise

The codebase carried 88 lint warnings. At 88, warning #89 is invisible —
nobody reads the pile. Now it's **zero**, and CI fails on any new one, which
means a warning is once again information.

Getting to zero was not "delete whatever the linter dislikes" — three cases
prove why each site had to be read first:

- **`middleware.ts`'s seven "unused" variables are the parked geo-blocking
  feature** (finding #35, awaiting a team decision). Deleting them would have
  destroyed benched work. They're suppressed with a comment pointing at #35.
- **Three hook-dependency warnings would become infinite loops if "fixed"
  naively** — the functions involved are recreated every render and set
  state. Each carries a suppression comment explaining the why.
- **One variable looked used** — there's a call to it right in the file — but
  the call sits inside commented-out JSX. Verified before removing.

The rest were genuine dirt: fourteen unused `catch (err)` bindings, dead
destructurings, and one component maintaining hover state through six event
handlers that nothing ever read.

## 5. i18n retired (the tooling, not the runtime)

Decision: the app is English-only; translations are dead. So the translation
*machinery* went: the custom lint rule (45 of the 88 warnings), three CI
steps, the Crowdin sync workflow.

What deliberately stayed: the `t()` calls and locale files. The app's
translation keys ARE the English sentences, so everything renders identically
with zero risk. Ripping `t()` out of hundreds of components is a separate
project with separate review — not something to smuggle into a lint cleanup.

## 6. The merge-commit story: how working code silently vanished

This deserves its own section because it cost real code once and days of
conflict pain since.

**What "Squash and merge" does:** it takes all your branch's commits and
creates ONE brand-new commit on develop with the same content but **no shared
history**. For a branch that dies right after, that's tidy. For a branch you
keep working on, it's poison: next PR, git compares your branch against
develop, finds the same files "changed on both sides" (one side being an
anonymous photocopy of your own earlier work), and declares conflicts. Every
time. And one day the conflict resolves the wrong way.

**It wasn't hypothetical.** In July, the external-wallet swap gate was
written and committed — and the squash-merge of PR #466 shipped a version
without it. Nobody noticed for almost a month, because (section 1) nothing
was watching.

**The root cause hid in settings:** branch protection had **"Require linear
history"** checked, which *forbids* merge commits — the safe option wasn't
being ignored, it was banned. That box is now unchecked, "Allow force pushes"
(which was on, for everyone!) is off, the ghost required-checks that could
never report are replaced with the real `web (22.x)`, and the approval
requirement is off while the team is one person.

**The habit that keeps it fixed:** long-lived branch → merge with a **merge
commit**. Short throwaway branch → squash is fine, then delete the branch.

## 7. How to read your safety net

- **On a PR:** the checks box shows `web (22.x)` with "Required". Click
  *Details* to see every step — ESLint, TypeScript, Jest — each with its own
  tick. All green = lint clean, types sound, all tests passing, against
  up-to-date code.
- **Locally:** `yarn lint` and `yarn test` are the same gates. Since lint hit
  zero, **silence is the green light** — ESLint only speaks when something is
  wrong.

## 8. What this unlocks next

In order: the 37-route withAuth sweep and finding #50's five routes (safe now
that merges are sane), the repo-wide Prettier reformat (then flip that CI
step to blocking), CI secrets if we want the build gate blocking, and the
swap-gate component test — the one that makes July's silent deletion
physically impossible to repeat, because CI would go red the moment the gate
disappears again.
