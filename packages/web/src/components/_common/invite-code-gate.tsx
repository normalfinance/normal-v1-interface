'use client';

import { paths } from '@/routes/paths';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePersistStore } from '@normalfinance/state';

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
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check invite code status
  useEffect(() => {
    if (!isHydrated) return;

    // Skip enforcement in development unless explicitly requested
    if (process.env.NODE_ENV === 'development' && !enforceInDev) {
      return;
    }

    // Show dialog if no valid invite code
    if (!inviteCodeState.hasValidCode) {
      setShowInviteDialog(true);
    } else {
      setShowInviteDialog(false);
    }
  }, [inviteCodeState.hasValidCode, isHydrated, enforceInDev]);

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return null;
  }

  // Skip enforcement in development unless explicitly requested
  if (process.env.NODE_ENV === 'development' && !enforceInDev) {
    return <>{children}</>;
  }

  const isUnblockedPath = UNBLOCKED_PATHS.includes(pathName.toLowerCase());

  // Block access if no valid invite code
  if (!inviteCodeState.hasValidCode && !isUnblockedPath) {
    return (
      <InviteCodeDialog
        open={showInviteDialog}
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
