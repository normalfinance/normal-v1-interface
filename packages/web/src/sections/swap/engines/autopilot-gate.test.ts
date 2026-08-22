import { createAutopilotGate } from './autopilot-gate';

describe('createAutopilotGate', () => {
  it('asks the status route while nothing has been granted', async () => {
    const check = jest.fn().mockResolvedValue(false);
    expect(await createAutopilotGate(check).isActive()).toBe(false);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('passes through an already-active delegation', async () => {
    expect(await createAutopilotGate(async () => true).isActive()).toBe(true);
  });

  it('honours a grant made DURING the run, without re-reading status', async () => {
    // The live bug: the ceremony had completed, but the status snapshot taken
    // for this leg still said false, so the user signed manually on the very
    // swap they had just enabled automatic signing for.
    const check = jest.fn().mockResolvedValue(false);
    const gate = createAutopilotGate(check);
    gate.markGranted();
    expect(await gate.isActive()).toBe(true);
    expect(check).not.toHaveBeenCalled();
  });

  it('stays granted across several legs', async () => {
    const gate = createAutopilotGate(async () => false);
    gate.markGranted();
    expect(await gate.isActive()).toBe(true);
    expect(await gate.isActive()).toBe(true);
  });
});
