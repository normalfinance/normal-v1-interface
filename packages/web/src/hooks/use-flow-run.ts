'use client';

import type { RunState, FlowPlan, StepState } from '@/lib/flow/types';

import { useRef, useMemo, useState } from 'react';
import {
  stopRun,
  failRun,
  skipStep,
  beginRun,
  finishRun,
  startStep,
  handOffRun,
  initialRun,
  updateStep,
  completeStep,
} from '@/lib/flow/run';

// ---------------------------------------------------------------------------
// The live run of one money movement, for an engine to report into.
//
// The plan is FROZEN when the run begins: the engines clear their quote and
// the form clears its amount the moment a swap succeeds, and a plan rebuilt
// from those would lose its numbers on the very screen that reports success.
// `replan` swaps the words mid-run (same step ids) when the truth changes: a
// one-signature swap that needs two after all, auto-finish switched on.
// ---------------------------------------------------------------------------

export interface FlowRunApi {
  run: RunState;
  /** The plan the run reports against; null before it begins. */
  plan: FlowPlan | null;
  begin: (plan: FlowPlan) => void;
  replan: (plan: FlowPlan) => void;
  /**
   * Rewrites the plan the run is on (a refund rewrites the rest of the
   * journey, `refundedPlan`). Reads the current plan, not a render's copy, so
   * a tracker callback can call it.
   */
  reshape: (fn: (plan: FlowPlan) => FlowPlan) => void;
  start: (id: string, patch?: Partial<StepState>) => void;
  update: (id: string, patch: Partial<StepState>) => void;
  done: (id: string, patch?: Partial<StepState>) => void;
  skip: (id: string, note?: string) => void;
  fail: (error: string, id?: string) => void;
  finish: () => void;
  stop: (ending: string) => void;
  handOff: (message: string) => void;
  reset: () => void;
}

export function useFlowRun(): FlowRunApi {
  const [run, setRun] = useState<RunState>(initialRun);
  const [plan, setPlan] = useState<FlowPlan | null>(null);
  // Reducers read the plan from here, so a report fired in the same tick as
  // `begin` (before React re-renders) still finds it.
  const planRef = useRef<FlowPlan | null>(null);

  const api = useMemo(() => {
    const withPlan = (fn: (s: RunState, p: FlowPlan) => RunState) =>
      setRun((s) => (planRef.current ? fn(s, planRef.current) : s));
    return {
      begin: (next: FlowPlan) => {
        planRef.current = next;
        setPlan(next);
        setRun(beginRun(Date.now()));
      },
      replan: (next: FlowPlan) => {
        planRef.current = next;
        setPlan(next);
      },
      reshape: (fn: (plan: FlowPlan) => FlowPlan) => {
        if (!planRef.current) return;
        const next = fn(planRef.current);
        if (next === planRef.current) return;
        planRef.current = next;
        setPlan(next);
      },
      start: (id: string, patch?: Partial<StepState>) =>
        withPlan((s, p) => startStep(s, p, id, Date.now(), patch)),
      update: (id: string, patch: Partial<StepState>) => setRun((s) => updateStep(s, id, patch)),
      done: (id: string, patch?: Partial<StepState>) =>
        withPlan((s, p) => completeStep(s, p, id, Date.now(), patch)),
      skip: (id: string, note?: string) => setRun((s) => skipStep(s, id, note)),
      fail: (error: string, id?: string) =>
        withPlan((s, p) => failRun(s, p, error, Date.now(), id)),
      finish: () => withPlan((s, p) => finishRun(s, p, Date.now())),
      stop: (ending: string) => withPlan((s, p) => stopRun(s, p, ending, Date.now())),
      handOff: (message: string) => setRun((s) => handOffRun(s, message, Date.now())),
      reset: () => {
        planRef.current = null;
        setPlan(null);
        setRun(initialRun());
      },
    };
  }, []);

  return { run, plan, ...api };
}
