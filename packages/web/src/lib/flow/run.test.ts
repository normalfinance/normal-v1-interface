import { it, expect, describe } from '@jest/globals';

import {
  stopRun,
  failRun,
  stepsOf,
  skipStep,
  beginRun,
  statusOf,
  finishRun,
  startStep,
  initialRun,
  progressOf,
  updateStep,
  completeStep,
  moneyPosition,
  waitingOnPerson,
} from './run';

import type { FlowPlan, FlowStepDef } from './types';

// A small journey: wallet → (sign, approve?, send) → exchange → (send out) → other wallet.
const s = (id: string, money: FlowStepDef['money'] = 'here', optional?: string): FlowStepDef => ({
  id,
  title: id,
  detail: '',
  actor: 'x',
  money,
  optional,
});

const PLAN: FlowPlan = {
  items: [
    { kind: 'place', place: { id: 'from', label: 'Your wallet' } },
    { kind: 'step', step: s('sign') },
    { kind: 'step', step: s('approve', 'here', 'First time only') },
    { kind: 'step', step: s('send', 'moving') },
    { kind: 'place', place: { id: 'exchange', label: 'Exchange' } },
    { kind: 'step', step: s('confirm') },
    { kind: 'step', step: s('deliver', 'moving') },
    { kind: 'place', place: { id: 'to', label: 'Your other wallet' } },
    { kind: 'step', step: s('balance') },
  ],
};

const T0 = 1_000_000;

describe('flow run', () => {
  it('starts in review with the money at the first place', () => {
    const run = initialRun();
    expect(run.phase).toBe('review');
    expect(moneyPosition(PLAN, run)).toEqual({ placeId: 'from', moving: false, toPlaceId: null });
    expect(progressOf(PLAN, run)).toEqual({ done: 0, total: 6 });
  });

  it('starting a step closes the ones before it: done, or skipped when optional', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'sign', T0 + 10);
    run = startStep(run, PLAN, 'send', T0 + 20);
    expect(statusOf(run, 'sign')).toBe('done');
    expect(statusOf(run, 'approve')).toBe('skipped');
    expect(statusOf(run, 'send')).toBe('active');
    expect(run.steps.sign.endedAt).toBe(T0 + 20);
  });

  it('never moves backwards on a late report', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'confirm', T0 + 10);
    const again = startStep(run, PLAN, 'sign', T0 + 20);
    expect(again).toBe(run);
    expect(again.activeId).toBe('confirm');
  });

  it('keeps the start time when the same step is started twice', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'confirm', T0 + 10);
    run = startStep(run, PLAN, 'confirm', T0 + 99, { note: 'still waiting' });
    expect(run.steps.confirm.startedAt).toBe(T0 + 10);
    expect(run.steps.confirm.note).toBe('still waiting');
  });

  it('follows the money: on its way during a moving step, there once it is done', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'send', T0 + 10);
    expect(moneyPosition(PLAN, run)).toEqual({
      placeId: 'from',
      moving: true,
      toPlaceId: 'exchange',
    });

    run = completeStep(run, PLAN, 'send', T0 + 20);
    expect(moneyPosition(PLAN, run)).toEqual({
      placeId: 'exchange',
      moving: false,
      toPlaceId: null,
    });

    run = startStep(run, PLAN, 'confirm', T0 + 30);
    expect(moneyPosition(PLAN, run)).toEqual({
      placeId: 'exchange',
      moving: false,
      toPlaceId: null,
    });

    run = finishRun(run, PLAN, T0 + 40);
    expect(moneyPosition(PLAN, run)).toEqual({ placeId: 'to', moving: false, toPlaceId: null });
  });

  it('a link added after a later step started leaves that step running', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'confirm', T0 + 10);
    run = completeStep(run, PLAN, 'send', T0 + 20, {
      links: [{ label: 'View', href: 'https://x/tx/1' }],
    });
    expect(run.activeId).toBe('confirm');
    expect(run.steps.send.links).toEqual([{ label: 'View', href: 'https://x/tx/1' }]);
    // The same link twice is kept once.
    run = completeStep(run, PLAN, 'send', T0 + 30, {
      links: [{ label: 'View', href: 'https://x/tx/1' }],
    });
    expect(run.steps.send.links).toHaveLength(1);
  });

  it('a failure lands on the step that was running and ends the run', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'confirm', T0 + 10);
    run = failRun(run, PLAN, 'The bridge refused it', T0 + 20);
    expect(run.phase).toBe('failed');
    expect(run.error).toBe('The bridge refused it');
    expect(statusOf(run, 'confirm')).toBe('failed');
    expect(statusOf(run, 'deliver')).toBe('upcoming');
  });

  it('a step that failed while moving leaves the money where it started', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'deliver', T0 + 10);
    run = failRun(run, PLAN, 'Refused', T0 + 20);
    expect(moneyPosition(PLAN, run)).toEqual({
      placeId: 'exchange',
      moving: false,
      toPlaceId: null,
    });
  });

  it('a failure before anything ran lands on the first step', () => {
    const run = failRun(beginRun(T0), PLAN, 'Declined', T0 + 5);
    expect(statusOf(run, 'sign')).toBe('failed');
  });

  it('finishing settles every step', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'send', T0 + 10);
    run = finishRun(run, PLAN, T0 + 20);
    expect(run.phase).toBe('done');
    expect(stepsOf(PLAN).every((st) => ['done', 'skipped'].includes(statusOf(run, st.id)))).toBe(
      true
    );
    expect(progressOf(PLAN, run)).toEqual({ done: 6, total: 6 });
  });

  it('a calm ending stops the running step without calling it a failure', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'confirm', T0 + 10);
    run = stopRun(run, PLAN, 'The bridge sent it back.', T0 + 20);
    expect(run.phase).toBe('stopped');
    expect(run.ending).toBe('The bridge sent it back.');
    expect(statusOf(run, 'confirm')).toBe('stopped');
    expect(run.error).toBeNull();
    // The money went back where it started: the screen says so.
    expect(moneyPosition(PLAN, run)).toEqual({ placeId: 'from', moving: false, toPlaceId: null });
  });

  it('marks a step waiting on the person, and clears it when the step is done', () => {
    let run = beginRun(T0);
    run = startStep(run, PLAN, 'sign', T0 + 10);
    run = updateStep(run, 'sign', { waiting: true });
    expect(waitingOnPerson(run)).toBe(true);
    run = completeStep(run, PLAN, 'sign', T0 + 20);
    expect(waitingOnPerson(run)).toBe(false);
    expect(run.steps.sign.waiting).toBe(false);
  });

  it('skips an optional step explicitly, with the reason', () => {
    let run = beginRun(T0);
    run = skipStep(run, 'approve', 'You approved this before');
    expect(statusOf(run, 'approve')).toBe('skipped');
    expect(run.steps.approve.note).toBe('You approved this before');
  });

  it('ignores reports about steps the plan does not have', () => {
    const run = beginRun(T0);
    expect(startStep(run, PLAN, 'nope', T0 + 1)).toBe(run);
    expect(completeStep(run, PLAN, 'nope', T0 + 1)).toBe(run);
  });
});
