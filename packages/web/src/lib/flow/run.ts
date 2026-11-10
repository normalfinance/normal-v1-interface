import type { RunState, FlowPlan, StepState, FlowPlace, FlowStepDef, MoneyPosition } from './types';

// ---------------------------------------------------------------------------
// The live state of a flow, as pure functions over (plan, state). The engines
// report what they know ("the burn is being signed", "Circle signed the
// release"); these rules turn that into a state the screen can trust:
//
//   - A run only moves forward. A late or repeated report about an earlier
//     step never sends the screen backwards.
//   - Starting a step closes every step before it. A step the engine never
//     reported (the server did it, as with auto-finish) is marked done; an
//     optional one it never reached ("first time only") is marked skipped.
//   - Ending a run settles every step, so nothing is left spinning.
// ---------------------------------------------------------------------------

export const initialRun = (): RunState => ({
  phase: 'review',
  steps: {},
  activeId: null,
  startedAt: null,
  endedAt: null,
  error: null,
  ending: null,
});

export function stepsOf(plan: FlowPlan): FlowStepDef[] {
  return plan.items.flatMap((item) => (item.kind === 'step' ? [item.step] : []));
}

export function placesOf(plan: FlowPlan): FlowPlace[] {
  return plan.items.flatMap((item) => (item.kind === 'place' ? [item.place] : []));
}

const indexOfStep = (plan: FlowPlan, id: string) => stepsOf(plan).findIndex((s) => s.id === id);

export const statusOf = (state: RunState, id: string) => state.steps[id]?.status ?? 'upcoming';

const TERMINAL = new Set(['done', 'skipped', 'failed', 'stopped']);

/** Close every step before `index` that is still open. */
function closeBefore(
  plan: FlowPlan,
  steps: Record<string, StepState>,
  index: number,
  now: number
): Record<string, StepState> {
  const next = { ...steps };
  stepsOf(plan)
    .slice(0, index)
    .forEach((def) => {
      const current = next[def.id];
      const status = current?.status ?? 'upcoming';
      if (status === 'active') {
        next[def.id] = { ...current, status: 'done', endedAt: now, waiting: false };
      } else if (status === 'upcoming') {
        next[def.id] = { ...current, status: def.optional ? 'skipped' : 'done', endedAt: now };
      }
    });
  return next;
}

export function beginRun(now: number): RunState {
  return { ...initialRun(), phase: 'running', startedAt: now };
}

/** The engine moved on to `id`. Ignored if the run is already past it. */
export function startStep(
  state: RunState,
  plan: FlowPlan,
  id: string,
  now: number,
  patch: Partial<StepState> = {}
): RunState {
  const index = indexOfStep(plan, id);
  if (index < 0) return state;
  if (state.activeId && indexOfStep(plan, state.activeId) > index) return state;
  if (TERMINAL.has(statusOf(state, id))) return state;

  const steps = closeBefore(plan, state.steps, index, now);
  const previous = steps[id];
  steps[id] = {
    ...previous,
    ...patch,
    status: 'active',
    startedAt: previous?.status === 'active' ? previous.startedAt : now,
    endedAt: undefined,
  };
  return {
    ...state,
    phase: state.phase === 'review' ? 'running' : state.phase,
    startedAt: state.startedAt ?? now,
    steps,
    activeId: id,
  };
}

/** New detail on a step (a note, a link, "waiting for you"), status unchanged. */
export function updateStep(state: RunState, id: string, patch: Partial<StepState>): RunState {
  const previous = state.steps[id];
  const links = patch.links ? mergeLinks(previous?.links, patch.links) : previous?.links;
  return {
    ...state,
    steps: {
      ...state.steps,
      [id]: { ...previous, ...patch, links, status: previous?.status ?? 'upcoming' },
    },
  };
}

function mergeLinks(a: StepState['links'], b: StepState['links']) {
  const out = [...(a ?? [])];
  (b ?? []).forEach((link) => {
    if (!out.some((x) => x.href === link.href)) out.push(link);
  });
  return out;
}

/** `id` finished. Steps before it close too. */
export function completeStep(
  state: RunState,
  plan: FlowPlan,
  id: string,
  now: number,
  patch: Partial<StepState> = {}
): RunState {
  const index = indexOfStep(plan, id);
  if (index < 0) return state;
  if (TERMINAL.has(statusOf(state, id)) && !patch.note && !patch.links) return state;

  const steps = closeBefore(plan, state.steps, index, now);
  const previous = steps[id];
  const links = patch.links ? mergeLinks(previous?.links, patch.links) : previous?.links;
  steps[id] = {
    ...previous,
    ...patch,
    links,
    status: 'done',
    waiting: false,
    endedAt: previous?.endedAt && TERMINAL.has(previous.status) ? previous.endedAt : now,
  };
  // A later step may already be running (a link added late): it stays active.
  const activeStillAhead = !!state.activeId && indexOfStep(plan, state.activeId) > index;
  return {
    ...state,
    phase: state.phase === 'review' ? 'running' : state.phase,
    startedAt: state.startedAt ?? now,
    steps,
    activeId: activeStillAhead ? state.activeId : null,
  };
}

/** `id` was not needed this time ("you approved this before"). */
export function skipStep(state: RunState, id: string, note?: string): RunState {
  if (TERMINAL.has(statusOf(state, id))) return state;
  return {
    ...state,
    steps: { ...state.steps, [id]: { ...state.steps[id], status: 'skipped', note } },
    activeId: state.activeId === id ? null : state.activeId,
  };
}

/** The step that was running (or `id`) failed; the run ends. */
export function failRun(
  state: RunState,
  plan: FlowPlan,
  error: string,
  now: number,
  id?: string
): RunState {
  const target =
    id ??
    state.activeId ??
    stepsOf(plan).find((s) => !TERMINAL.has(statusOf(state, s.id)))?.id ??
    null;
  const steps = { ...state.steps };
  if (target) {
    steps[target] = { ...steps[target], status: 'failed', waiting: false, endedAt: now };
  }
  return { ...state, phase: 'failed', steps, activeId: target, error, endedAt: now };
}

/** Every step finished. */
export function finishRun(state: RunState, plan: FlowPlan, now: number): RunState {
  const all = stepsOf(plan);
  const steps = closeBefore(plan, state.steps, all.length, now);
  return { ...state, phase: 'done', steps, activeId: null, error: null, endedAt: now };
}

/**
 * It ended early and nothing is wrong: the step that was running stops there,
 * and the money is back where it started (a bridge returned it, or it never
 * left). Use failRun when that is not true.
 */
export function stopRun(state: RunState, plan: FlowPlan, ending: string, now: number): RunState {
  const target =
    state.activeId ?? stepsOf(plan).find((s) => !TERMINAL.has(statusOf(state, s.id)))?.id ?? null;
  const steps = { ...state.steps };
  if (target) steps[target] = { ...steps[target], status: 'stopped', waiting: false, endedAt: now };
  return { ...state, phase: 'stopped', steps, activeId: target, ending, endedAt: now };
}

/**
 * This page's part is over and Normal finishes the rest on its servers (the
 * USDC on its way back after a refund). The running step stays open.
 */
export function handOffRun(state: RunState, message: string, now: number): RunState {
  return { ...state, phase: 'handed-off', ending: message, endedAt: now };
}

// ---- reading it ------------------------------------------------------------

/** The step the screen talks about: the running one, else the last one settled. */
export function focusStep(plan: FlowPlan, state: RunState): FlowStepDef | null {
  const all = stepsOf(plan);
  if (state.activeId) return all.find((s) => s.id === state.activeId) ?? null;
  const settled = all.filter((s) => statusOf(state, s.id) !== 'upcoming');
  return settled[settled.length - 1] ?? null;
}

/**
 * Where the money is. Before anything runs, at the first place. While a
 * 'moving' step runs, on its way from the place above it to the next one;
 * once that step is done, at the next one. At the end, at the last place.
 */
export function moneyPosition(plan: FlowPlan, state: RunState): MoneyPosition | null {
  const places = placesOf(plan);
  if (!places.length) return null;
  // A calm ending (stopRun) means the money is back where it started: a bridge
  // returned it, or it never left. Every caller of stopRun ends that way. A
  // journey rewritten for a refund ends at that wallet again (`back`), so the
  // money is shown there, after the steps that brought it back.
  if (state.phase === 'review' || state.phase === 'stopped') {
    const home = (state.phase === 'stopped' && places.find((p) => p.back)) || places[0];
    return { placeId: home.id, moving: false, toPlaceId: null };
  }
  if (state.phase === 'done') {
    return { placeId: places[places.length - 1].id, moving: false, toPlaceId: null };
  }

  const step = focusStep(plan, state);
  if (!step) return { placeId: places[0].id, moving: false, toPlaceId: null };

  // The places either side of the step: the last one above it, the first below.
  let from: FlowPlace = places[0];
  let to: FlowPlace | null = null;
  let seen = false;
  for (let i = 0; i < plan.items.length; i += 1) {
    const item = plan.items[i];
    if (item.kind === 'step') {
      if (item.step.id === step.id) seen = true;
    } else if (!seen) {
      from = item.place;
    } else {
      to = item.place;
      break;
    }
  }
  const status = statusOf(state, step.id);

  if (step.money === 'moving') {
    if (status === 'done' && to) return { placeId: to.id, moving: false, toPlaceId: null };
    if (status === 'active') return { placeId: from.id, moving: true, toPlaceId: to?.id ?? null };
  }
  // A step that failed or stopped while moving did not deliver: the money is
  // still where that step started (each engine's message says so in words).
  return { placeId: from.id, moving: false, toPlaceId: null };
}

/** Steps settled out of all steps: "4 of 11". Skipped counts as settled. */
export function progressOf(plan: FlowPlan, state: RunState): { done: number; total: number } {
  const all = stepsOf(plan);
  const done = all.filter((s) => {
    const st = statusOf(state, s.id);
    return st === 'done' || st === 'skipped';
  }).length;
  return { done, total: all.length };
}

/** Is any step waiting on the person (a prompt is open)? */
export const waitingOnPerson = (state: RunState) =>
  !!state.activeId && !!state.steps[state.activeId]?.waiting;
