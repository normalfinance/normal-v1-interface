'use client';

// Global mandatory-backup gate (doc 79 D2). ONE mount for the whole app, so
// no creation path can forget to demand backup (the recurring "a fourth site
// forgot" lesson). It fires whenever a NEW wallet's needs-backup marker is
// present on this device — set by markWalletNeedsBackup() at the single
// creation chokepoint — and forces the export dialog until the user confirms
// they saved the phrase. Resumable by construction: the marker persists, so a
// killed tab re-prompts on next load; a legacy wallet has no marker and is
// never force-gated (Settings covers it).

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import {
  markWalletBackedUp,
  pendingBackupSubOrg,
  BACKUP_REQUIRED_EVENT,
} from '@/lib/turnkey/wallet-backup';

import WalletExportDialog from './wallet-export-dialog';

export default function WalletBackupGate() {
  const { user } = useSupabaseAuth();
  const [subOrgId, setSubOrgId] = useState<string | null>(null);

  const recheck = useCallback(() => {
    setSubOrgId(user ? pendingBackupSubOrg() : null);
  }, [user]);

  useEffect(() => {
    recheck();
    window.addEventListener(BACKUP_REQUIRED_EVENT, recheck);
    // A second tab finishing backup, or login/logout, should re-sync the gate.
    window.addEventListener('storage', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      window.removeEventListener(BACKUP_REQUIRED_EVENT, recheck);
      window.removeEventListener('storage', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [recheck]);

  if (!user || !subOrgId) return null;

  return (
    <WalletExportDialog
      open
      requireConfirm
      onConfirmedBackup={() => markWalletBackedUp(subOrgId)}
      onClose={() => setSubOrgId(null)}
    />
  );
}
