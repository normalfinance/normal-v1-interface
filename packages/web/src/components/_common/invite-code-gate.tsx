'use client';

import { paths } from '@/routes/paths';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePersistStore } from '@normalfinance/state';
import { useUrlInviteCode } from '@/hooks/use-url-invite-code';

import InviteCodeDialog from './drawer-components/invite-code-dialog';

export type InviteCodeGateProps = {
  children: React.ReactNode;
  enforceInDev?: boolean;
};

const UNBLOCKED_PATHS = [paths.root, paths.core.about, paths.core.contact];

export const InviteCodeGate: React.FC<InviteCodeGateProps> = ({
  children,
  enforceInDev = true,
}) => {
  const pathName = usePathname();
  const inviteCodeState = usePersistStore((s) => s.inviteCode);
  const walletAddress = usePersistStore((s) => s.wallet.address);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize URL invite code detection
  useUrlInviteCode();

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check invite code status
  useEffect(() => {
    if (!isHydrated) return;

    console.log('[invite-debug] InviteCodeGate effect running');
    console.log('[invite-debug] walletAddress:', walletAddress);
    console.log('[invite-debug] inviteCodeState:', inviteCodeState);
    console.log('[invite-debug] enforceInDev:', enforceInDev);
    console.log('[invite-debug] NODE_ENV:', process.env.NODE_ENV);

    // Skip enforcement in development unless explicitly requested
    if (process.env.NODE_ENV === 'development' && !enforceInDev) {
      console.log('[invite-debug] Skipping enforcement in development');
      return;
    }

    // Only show dialog if wallet is connected and no valid invite code
    if (walletAddress && !inviteCodeState.hasValidCode) {
      console.log('[invite-debug] Should show invite dialog - wallet connected but no valid code');
      setShowInviteDialog(true);
    } else {
      console.log('[invite-debug] Should NOT show invite dialog');
      setShowInviteDialog(false);
    }
  }, [inviteCodeState.hasValidCode, walletAddress, isHydrated, enforceInDev]);

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  // Skip enforcement in development unless explicitly requested
  if (process.env.NODE_ENV === 'development' && !enforceInDev) {
    return <>{children}</>;
  }

  const isUnblockedPath = UNBLOCKED_PATHS.includes(pathName.toLowerCase());
  console.log('[invite-debug] Current path:', pathName);
  console.log('[invite-debug] Is unblocked path:', isUnblockedPath);
  console.log('[invite-debug] UNBLOCKED_PATHS:', UNBLOCKED_PATHS);

  // Block access if wallet is connected but no valid invite code
  if (walletAddress && !inviteCodeState.hasValidCode && !isUnblockedPath) {
    console.log('[invite-debug] Rendering InviteCodeDialog');
    console.log('[invite-debug] showInviteDialog state:', showInviteDialog);
    return (
      <InviteCodeDialog
        open={showInviteDialog}
        walletAddress={walletAddress}
        onClose={() => {
          // Check if invite code was accepted during dialog interaction
          if (inviteCodeState.hasValidCode) {
            setShowInviteDialog(false);
          }
        }}
      />
    );
  }

  // Allow access with valid invite code
  return <>{children}</>;
};
