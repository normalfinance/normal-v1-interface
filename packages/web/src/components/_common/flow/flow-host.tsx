'use client';

import type { ReactNode } from 'react';

import { createPortal } from 'react-dom';
import { useMemo, useState, useEffect, useContext, createContext } from 'react';

import Box from '@mui/material/Box';

// ---------------------------------------------------------------------------
// The in-app "window" a money movement opens in. A page wraps its content in
// <FlowHost>; a card that runs a deposit or swap renders its review screen in
// <FlowPortal>. While the portal is open the page's own content is hidden and
// the review fills the page, with the app's sidebar still beside it.
//
// The page content is hidden, NOT unmounted, on purpose: the card that owns
// the swap (its quote, its engine, the transaction in flight) lives in there,
// and unmounting it would stop the swap. The portal carries React context and
// state with it, so the card keeps running the show from where it sits.
// ---------------------------------------------------------------------------

type HostValue = { slot: HTMLElement | null; setOpen: (open: boolean) => void };

const FlowHostContext = createContext<HostValue | null>(null);

export function FlowHost({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ slot, setOpen }), [slot]);

  return (
    <FlowHostContext.Provider value={value}>
      <Box sx={{ display: open ? 'none' : 'block' }}>{children}</Box>
      <Box ref={setSlot} />
    </FlowHostContext.Provider>
  );
}

/** Renders `children` as the page while mounted. Outside a host: in place. */
export function FlowPortal({ children }: { children: ReactNode }) {
  const host = useContext(FlowHostContext);
  const setOpen = host?.setOpen;

  useEffect(() => {
    if (!setOpen) return undefined;
    setOpen(true);
    // A new screen starts at its top, like any page you open.
    window.scrollTo(0, 0);
    return () => setOpen(false);
  }, [setOpen]);

  if (!host) return <>{children}</>;
  if (!host.slot) return null;
  return createPortal(children, host.slot);
}
