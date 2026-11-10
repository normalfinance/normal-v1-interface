'use client';

import type { ReactNode } from 'react';

import ActionCodeGate from '@/components/_common/action-code-gate';
import WalletBackupGate from '@/components/_common/wallet-backup-gate';
import ExternalWalletReattach from '@/components/_common/external-wallet-reattach';

import { ModalProvider } from './ModalProvider';
import { ReferralProvider } from './ReferralProvider';
import { AssetActionsProvider } from './AssetActionsProvider';
import { SupabaseAuthProvider } from './SupabaseAuthProvider';
import { WalletPasswordProvider } from './WalletPasswordProvider';

// ----------------------------------------------------------------------

/**
 * Sign-in, the wallet and the gates in front of every money action. Wraps the
 * app and the sign-in pages (app/(wallet)), never the marketing site.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SupabaseAuthProvider>
      {/* Referral tracking: adopts the code the marketing site captured, and reports it. */}
      <ReferralProvider>
        <WalletPasswordProvider>
          <ModalProvider>
            <AssetActionsProvider>
              {children}
              {/* doc 79: one global mandatory-backup gate */}
              <WalletBackupGate />
              {/* The 6-digit code before every money action */}
              <ActionCodeGate />
              {/* Re-attach the external wallet after login */}
              <ExternalWalletReattach />
            </AssetActionsProvider>
          </ModalProvider>
        </WalletPasswordProvider>
      </ReferralProvider>
    </SupabaseAuthProvider>
  );
}
