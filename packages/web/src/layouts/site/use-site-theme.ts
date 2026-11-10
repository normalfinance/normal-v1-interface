'use client';

import type { Mode } from '@/theme/brand-colors';
import type { ThemeChoice } from '@/theme/site-theme';

import { useLayoutEffect, useSyncExternalStore } from 'react';
import { SITE_THEME_ATTR, SITE_THEME_STORAGE_KEY } from '@/theme/site-theme';

// ----------------------------------------------------------------------

// The visitor's light/dark choice for the marketing site: 'system' (the
// default), 'light' or 'dark', kept in localStorage. Every toggle on the page
// reads the same store, and other tabs follow through the storage event.

const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(SITE_THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** The mode a choice turns into. Mirrors SITE_THEME_INIT in theme/site-theme.ts. */
export function resolveSiteTheme(choice: ThemeChoice = readChoice()): Mode {
  if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return choice;
}

function applySiteTheme() {
  const mode = resolveSiteTheme();
  document.documentElement.setAttribute(SITE_THEME_ATTR, mode);
  document.documentElement.style.colorScheme = mode;
}

function notify() {
  applySiteTheme();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystem = () => {
    if (readChoice() === 'system') notify();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === SITE_THEME_STORAGE_KEY) notify();
  };
  media.addEventListener('change', onSystem);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onSystem);
    window.removeEventListener('storage', onStorage);
  };
}

export function setSiteThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'system') window.localStorage.removeItem(SITE_THEME_STORAGE_KEY);
    else window.localStorage.setItem(SITE_THEME_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: the choice holds for this page view only.
  }
  notify();
}

export function useSiteTheme() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'system' as ThemeChoice);
  const mode = useSyncExternalStore(
    subscribe,
    () => resolveSiteTheme(),
    () => 'light' as Mode
  );
  return { choice, mode, setChoice: setSiteThemeChoice };
}

/**
 * Mounted by the site frame and the app frame. Puts the visitor's mode on
 * <html> when either comes on screen: both follow the same choice.
 */
export function useSiteThemeScope() {
  useLayoutEffect(() => {
    applySiteTheme();
  }, []);
}
