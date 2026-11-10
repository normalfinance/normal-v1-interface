// ---------------------------------------------------------------------------
// A link that opens a money action in the app: `/app?action=buy`. Pure, so the
// marketing site can build these links without loading the app's code; the app
// opens them in `layouts/app/action-from-url.tsx`.
// ---------------------------------------------------------------------------

export type AppAction = 'buy' | 'sell' | 'send' | 'receive';

export const APP_ACTIONS: readonly AppAction[] = ['buy', 'sell', 'send', 'receive'];

export const appActionHref = (path: string, action: AppAction) => `${path}?action=${action}`;

/** The action an address asks for, or null. */
export function appActionFrom(search: string): AppAction | null {
  const action = new URLSearchParams(search).get('action');
  return APP_ACTIONS.includes(action as AppAction) ? (action as AppAction) : null;
}
