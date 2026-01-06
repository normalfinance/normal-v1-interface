// src/state/persist/createDisclaimerActions.ts
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { usePersistStore } from '../store';
import { AppStorePersist } from '@normalfinance/types';

export const createDisclaimerAction = () => {
  /* ---------------------------------------------------------------
   *  Bootstrap: read any previously-saved acceptance from localStorage
   * ------------------------------------------------------------- */
  const storedVersion =
    typeof window !== 'undefined' ? Number(localStorage.getItem('accepted_tos_version') ?? 0) : 0;

  const storedTimestamp =
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('accepted_tos_timestamp') ?? 0)
      : undefined;

  return {
    /* -------- initial slice state -------------------------------- */
    disclaimer: {
      accepted: storedVersion >= CURRENT_TOS_VERSION,
      version: storedVersion,
      acceptedAt: storedTimestamp,
    },

    /* -------- action -------------------------------------------- */
    setDisclaimerAccepted: async (accepted: boolean) => {
      if (!accepted) return; // You can add “Decline” behaviour if you wish

      const now = Date.now();

      /*     Persist to localStorage so we can read it synchronously
       *     before the zustand store hydrates on page refresh       */
      localStorage.setItem('accepted_tos_version', String(CURRENT_TOS_VERSION));
      localStorage.setItem('accepted_tos_timestamp', String(now));

      /*    Update zustand state                                    */
      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        disclaimer: {
          accepted: true,
          version: CURRENT_TOS_VERSION,
          acceptedAt: now,
        },
      }));
    },
  };
};
