'use client';

import { useEffect, useMemo, useRef } from 'react';
import VerifyOwnershipDialog from './verify-ownership';
import { usePersistStore } from '@normalfinance/state';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useProofDialogStore } from '@/stores/proof-dialog-store';

const PORTAL_ID = 'root-proof-portal';

export default function ProofOfOwnershipPortal() {
  const persist = usePersistStore();
  const address = persist.wallet.address || null;

  const { open, close, registerPortal, unregisterPortal } = useProofDialogStore();

  const isPrimaryRef = useRef(false);
  useEffect(() => {
    isPrimaryRef.current = registerPortal(PORTAL_ID);
    return () => unregisterPortal(PORTAL_ID);
  }, [registerPortal, unregisterPortal]);

  const verified = useMemo(
    () => (address ? isWalletVerifiedForSession(address) : false),
    [address]
  );

  useEffect(() => {
    if (!isPrimaryRef.current) return;
    if (!address || verified) close();
  }, [address, verified, close]);

  if (!isPrimaryRef.current) return null;

  return (
    <VerifyOwnershipDialog
      open={Boolean(open && address && !verified)}
      onClose={close}
      onVerified={close}
      message="i love normal"
    />
  );
}
