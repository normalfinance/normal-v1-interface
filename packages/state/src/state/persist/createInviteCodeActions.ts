import { usePersistStore } from '../store';
import { AppStorePersist } from '@normalfinance/types';

export const createInviteCodeActions = () => {
  const storedCode =
    typeof window !== 'undefined'
      ? localStorage.getItem('accepted_invite_code')
      : null;

  const storedTimestamp =
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('invite_code_timestamp') ?? 0)
      : null;

  return {
    inviteCode: {
      hasValidCode: !!storedCode,
      inviteCode: storedCode,
      verifiedAt: storedTimestamp,
    },

    setInviteCodeAccepted: async (code: string) => {
      try {
        // First verify the code with the API
        const response = await fetch('/api/testnet/invite-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            inviteCode: code,
            action: 'verify'
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Invalid invite code');
        }

        const now = Date.now();

        localStorage.setItem('accepted_invite_code', code);
        localStorage.setItem('invite_code_timestamp', String(now));

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