'use client';

import { useMemo } from 'react';
import VerifyOwnershipDialog from './verify-ownership';
import { usePersistStore } from '@normalfinance/state';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useProofDialogStore } from '@/stores/proof-dialog-store';

export default function ProofOfOwnershipPortal() {
  const persist = usePersistStore();
  const { open, close } = useProofDialogStore();

  const address = persist.wallet.address;
  const verified = useMemo(() => isWalletVerifiedForSession(address), [address]);

  return (
    <VerifyOwnershipDialog
      open={Boolean(open && address && !verified)}
      onClose={close}
      onVerified={close}
      message="i love normal"
    />
  );
}
