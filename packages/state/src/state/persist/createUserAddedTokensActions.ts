// src/state/persist/createUserAddedTokensActions.ts
import { UserAddedTokensActions, UserAddedTokensState } from '@normalfinance/types';
import { usePersistStore } from '../store';
import { AppStorePersist } from '@normalfinance/types';

const USER_ADDED_TOKENS_KEY = 'user_added_tokens';

function getLocalStorageValue(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function setLocalStorageValue(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

function getCurrentState(): UserAddedTokensState {
  const userAddedTokensStr = getLocalStorageValue(USER_ADDED_TOKENS_KEY);
  const userAddedTokens = userAddedTokensStr ? JSON.parse(userAddedTokensStr) : [];

  return {
    allUserAddedTokens: [],
    tokens: [],
    tokensAsMap: {},
  };
}

export const createUserAddedTokensAction = (): UserAddedTokensActions => {
  const initialState: UserAddedTokensState = getCurrentState();

  return {
    /* -------- initial slice state -------------------------------- */
    userAddedTokensState: initialState,

    /* -------- action -------------------------------------------- */
    addUserToken: async (tokenAddress: string) => {
      /*     Persist to localStorage so we can read it synchronously
       *     before the zustand store hydrates on page refresh       */
      // localStorage.setItem('accepted_tos_version', String(CURRENT_TOS_VERSION));

      /*    Update zustand state                                    */
      usePersistStore.setState((state: AppStorePersist) => ({
        ...state,
        userTokens: {
          tokens: [],
          allUserAddedTokens: [],
          tokensAsMap: {},
        },
      }));
    },
  };
};
