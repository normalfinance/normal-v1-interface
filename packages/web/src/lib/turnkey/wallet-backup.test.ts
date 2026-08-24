/**
 * @jest-environment jsdom
 */
// The chain-add path now re-asserts the backup requirement, so the "never
// nag a user who already saved their phrase" property is what keeps that
// from becoming a dialog on every BTC/ETH/SOL setup.

import {
  markWalletBackedUp,
  pendingBackupSubOrg,
  markWalletNeedsBackup,
  BACKUP_REQUIRED_EVENT,
} from './wallet-backup';

const SUB = 'suborg-1';

describe('wallet backup marker', () => {
  beforeEach(() => window.localStorage.clear());

  it('flags a wallet that has never been backed up', () => {
    markWalletNeedsBackup(SUB);
    expect(pendingBackupSubOrg()).toBe(SUB);
  });

  it('wakes the global gate immediately — creation happens mid-flow', () => {
    const seen = jest.fn();
    window.addEventListener(BACKUP_REQUIRED_EVENT, seen);
    markWalletNeedsBackup(SUB);
    expect(seen).toHaveBeenCalled();
    window.removeEventListener(BACKUP_REQUIRED_EVENT, seen);
  });

  it('never re-asks once the phrase is confirmed', () => {
    markWalletBackedUp(SUB);
    markWalletNeedsBackup(SUB); // e.g. the user adds a BTC address later
    expect(pendingBackupSubOrg()).toBeNull();
  });

  it('clears the prompt when that exact wallet is confirmed', () => {
    markWalletNeedsBackup(SUB);
    markWalletBackedUp(SUB);
    expect(pendingBackupSubOrg()).toBeNull();
  });

  it('leaves another wallet’s pending backup alone', () => {
    markWalletNeedsBackup(SUB);
    markWalletBackedUp('a-different-suborg');
    expect(pendingBackupSubOrg()).toBe(SUB);
  });
});
