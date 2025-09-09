import { ReferralActions, ReferralState, AppStorePersist } from '@normalfinance/types';
import { usePersistStore } from '../store';

const REFERRAL_COOKIE_NAME = 'referral_code';
const REFERRAL_TIMESTAMP_COOKIE_NAME = 'referral_timestamp';
const REFERRAL_USED_KEY = 'referral_used';
const REFERRAL_USED_ACTIONS_KEY = 'referral_used_actions';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function getLocalStorageValue(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function setLocalStorageValue(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

function getCurrentReferralState(): ReferralState {
  const referralCode = getCookie(REFERRAL_COOKIE_NAME);
  const timestampStr = getCookie(REFERRAL_TIMESTAMP_COOKIE_NAME);
  const referralTimestamp = timestampStr ? parseInt(timestampStr, 10) : null;

  // referral code -> { referrer, referral_code, referral_timestamp }

  const referralUsed = getLocalStorageValue(REFERRAL_USED_KEY) === 'true';
  const usedActionsStr = getLocalStorageValue(REFERRAL_USED_ACTIONS_KEY);
  const usedActions = usedActionsStr ? JSON.parse(usedActionsStr) : [];

  return {
    referralCode,
    referralTimestamp,
    hasReferral: !!referralCode,
    referralUsed,
    usedActions,
  };
}

export function createReferralActions(): ReferralActions {
  const initialState: ReferralState = getCurrentReferralState();

  return {
    referralState: initialState,

    setReferralCode: (code: string) => {
      const timestamp = Date.now();

      setCookie(REFERRAL_COOKIE_NAME, code, 30);
      setCookie(REFERRAL_TIMESTAMP_COOKIE_NAME, timestamp.toString(), 30);

      const newState: ReferralState = {
        referralCode: code,
        referralTimestamp: timestamp,
        hasReferral: true,
        referralUsed: false,
        usedActions: [],
      };

      setLocalStorageValue(REFERRAL_USED_KEY, 'false');
      setLocalStorageValue(REFERRAL_USED_ACTIONS_KEY, '[]');

      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        referralState: newState,
      }));
    },

    clearReferralCode: () => {
      deleteCookie(REFERRAL_COOKIE_NAME);
      deleteCookie(REFERRAL_TIMESTAMP_COOKIE_NAME);

      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(REFERRAL_USED_KEY);
        localStorage.removeItem(REFERRAL_USED_ACTIONS_KEY);
      }

      const newState: ReferralState = {
        referralCode: null,
        referralTimestamp: null,
        hasReferral: false,
        referralUsed: false,
        usedActions: [],
      };

      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        referralState: newState,
      }));
    },

    markReferralUsed: (action?: string) => {
      const currentState = getCurrentReferralState();

      if (!currentState.hasReferral) {
        return;
      }

      let newUsedActions = [...currentState.usedActions];

      if (action && !newUsedActions.includes(action)) {
        newUsedActions.push(action);
      }

      const shouldMarkUsed = newUsedActions.length > 0 || action === undefined;

      const newState: ReferralState = {
        ...currentState,
        referralUsed: shouldMarkUsed || currentState.referralUsed,
        usedActions: newUsedActions,
      };

      if (shouldMarkUsed) {
        setLocalStorageValue(REFERRAL_USED_KEY, 'true');
      }
      setLocalStorageValue(REFERRAL_USED_ACTIONS_KEY, JSON.stringify(newUsedActions));

      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        referralState: newState,
      }));
    },

    getReferralFromCookie: (): ReferralState => {
      return getCurrentReferralState();
    },
  };
}
