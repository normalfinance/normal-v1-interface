import { usePersistStore } from '../store';
import { AppStorePersist } from '@normalfinance/types';

export const createInviteCodeActions = () => {
  return {
    inviteCode: {
      hasValidCode: false,
      inviteCode: null,
      verifiedAt: null,
    },

    // Check if current wallet has valid invite code
    checkWalletInviteStatus: async (walletAddress: string) => {
      try {
        const response = await fetch(`/api/testnet/invite-codes?walletAddress=${encodeURIComponent(walletAddress)}`);
        
        if (response.ok) {
          const result = await response.json();
          const hasValidCode = result.hasUsedCode || false;
          
          usePersistStore.setState((state: AppStorePersist) => ({
            ...state,
            inviteCode: {
              hasValidCode,
              inviteCode: result.inviteCode || null,
              verifiedAt: result.usedAt ? new Date(result.usedAt).getTime() : null,
            },
          }));

          return hasValidCode;
        }

        return false;
      } catch (error) {
        console.error('Failed to check wallet invite status:', error);
        return false;
      }
    },

    setInviteCodeAccepted: async (code: string, walletAddress?: string) => {
      try {
        // Verify and consume the code with the API, linking to wallet address
        const response = await fetch('/api/testnet/invite-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            inviteCode: code,
            walletAddress: walletAddress,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Invalid invite code');
        }

        const now = Date.now();

        usePersistStore.setState((state: AppStorePersist) => ({
          ...state,
          inviteCode: {
            hasValidCode: true,
            inviteCode: code,
            verifiedAt: now,
          },
        }));

        return;
      } catch (error) {
        console.error('Failed to verify invite code:', error);
        throw error;
      }
    },

    clearInviteCode: () => {
      localStorage.removeItem('accepted_invite_code');
      localStorage.removeItem('invite_code_timestamp');

      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        inviteCode: {
          hasValidCode: false,
          inviteCode: null,
          verifiedAt: null,
        },
      }));
    },
  };
};