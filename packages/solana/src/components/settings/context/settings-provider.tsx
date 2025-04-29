'use client';

import { isEqual } from 'es-toolkit';
import { getCookie, getStorage } from 'minimal-shared/utils';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useCookies, useLocalStorage } from 'minimal-shared/hooks';

import { SettingsContext } from './settings-context';
import { SETTINGS_STORAGE_KEY } from '../settings-config';

import type { SettingsState, SettingsProviderProps } from '../types';

// ----------------------------------------------------------------------

export function SettingsProvider({
  children,
  cookieSettings,
  defaultSettings,
  storageKey = SETTINGS_STORAGE_KEY,
}: SettingsProviderProps) {
  const isCookieEnabled = !!cookieSettings;
  const useStorage = isCookieEnabled ? useCookies : useLocalStorage;
  const initialSettings = isCookieEnabled ? cookieSettings : defaultSettings;
  const getStorageValue = isCookieEnabled ? getCookie : getStorage;

  const { state, setState, resetState, setField } = useStorage<SettingsState>(
    storageKey,
    initialSettings
  );

  const canReset = !isEqual(state, defaultSettings);

  const onReset = useCallback(() => {
    resetState(defaultSettings);
  }, [defaultSettings, resetState]);

  // Version check and reset handling
  useEffect(() => {
    const storedValue = getStorageValue<SettingsState>(storageKey);

    if (storedValue) {
      try {
        if (!storedValue.version || storedValue.version !== defaultSettings.version) {
          onReset();
        }
      } catch {
        onReset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memoizedValue = useMemo(
    () => ({
      canReset,
      onReset,
      state,
      setState,
      setField,
    }),
    [canReset, onReset, state, setField, setState]
  );

  return <SettingsContext.Provider value={memoizedValue}>{children}</SettingsContext.Provider>;
}
