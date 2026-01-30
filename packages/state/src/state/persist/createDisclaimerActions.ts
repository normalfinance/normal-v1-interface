// src/state/persist/createDisclaimerActions.ts
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { usePersistStore } from '../store';
import type { AppStorePersist } from '@normalfinance/types';

const LS_VERSION_KEY = 'accepted_tos_version';
const LS_TIMESTAMP_KEY = 'accepted_tos_timestamp';

function readStoredVersion(): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(LS_VERSION_KEY) ?? 0) || 0;
}

function readStoredTimestamp(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const n = Number(localStorage.getItem(LS_TIMESTAMP_KEY) ?? 0) || 0;
  return n > 0 ? n : undefined;
}

export const createDisclaimerAction = () => {
  // Bootstrap: read synchronously so we can render correctly before zustand hydrates
  const storedVersion = readStoredVersion();
  const storedTimestamp = readStoredTimestamp();

  // Acceptance is per-device and only invalidates when CURRENT_TOS_VERSION increases
  const accepted = storedVersion >= CURRENT_TOS_VERSION;

  return {
    /* -------- initial slice state -------------------------------- */
    disclaimer: {
      accepted,
      version: accepted ? storedVersion : 0,
      acceptedAt: accepted ? storedTimestamp : undefined,
    },

    /* -------- actions -------------------------------------------- */
    setDisclaimerAccepted: async (accepted: boolean) => {
      if (!accepted) return; // Add "Decline" behavior if you want

      const now = Date.now();

      // Persist to localStorage so we can read it synchronously before hydration
      localStorage.setItem(LS_VERSION_KEY, String(CURRENT_TOS_VERSION));
      localStorage.setItem(LS_TIMESTAMP_KEY, String(now));

      // Update zustand state
      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        disclaimer: {
          accepted: true,
          version: CURRENT_TOS_VERSION,
          acceptedAt: now,
        },
      }));
    },

    /**
     * Optional helper: call this after login, app boot, or whenever you want to
     * force the slice to re-check localStorage (e.g. if you changed keys).
     */
    refreshDisclaimerFromStorage: async () => {
      const v = readStoredVersion();
      const ts = readStoredTimestamp();
      const isAccepted = v >= CURRENT_TOS_VERSION;

      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        disclaimer: {
          accepted: isAccepted,
          version: isAccepted ? v : 0,
          acceptedAt: isAccepted ? ts : undefined,
        },
      }));
    },
  };
};
