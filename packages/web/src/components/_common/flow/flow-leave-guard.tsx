'use client';

import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { INK, MUTED, PAPER, HOVER, INK_SOFT, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

// ---------------------------------------------------------------------------
// While a step that needs THIS page is running (the next signature comes from
// here, or the tab is what drives the next leg), leaving would park the money
// halfway. It stays safe at the person's own address, but they would have to
// come back and finish. So:
//   - a click on any link inside the app asks first ("Stay" or "Leave anyway"),
//   - closing or reloading the tab gets the browser's own "leave site?" prompt.
// When every remaining step finishes without the page, nothing is asked.
// ---------------------------------------------------------------------------

export function FlowLeaveGuard({
  active,
  title,
  message,
}: {
  active: boolean;
  title: string;
  message: string;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setPendingHref(null);
      return undefined;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers still need returnValue set to show their prompt.
      event.returnValue = '';
    };

    // Capture phase on the document runs before React's own handlers, so the
    // router never sees a click we hold back.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);

  const leave = () => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  };

  return (
    <Dialog
      open={!!pendingHref}
      onClose={() => setPendingHref(null)}
      PaperProps={{ sx: { borderRadius: 'var(--radius-lg)', maxWidth: 420, p: '24px' } }}
    >
      <Typography sx={{ fontSize: 17, fontWeight: 500, color: INK }}>{title}</Typography>
      <Typography sx={{ mt: 1.25, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
        {message}
      </Typography>
      <Box sx={{ mt: 2.5, display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <ButtonBase
          autoFocus
          onClick={() => setPendingHref(null)}
          sx={{
            flex: '1 1 160px',
            height: 44,
            px: 2,
            fontSize: 14,
            fontWeight: 500,
            color: PAPER,
            bgcolor: INK,
            '&:hover': { bgcolor: INK_SOFT },
            '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
          }}
        >
          {t('Stay on this page')}
        </ButtonBase>
        <ButtonBase
          onClick={leave}
          sx={{
            flex: '1 1 140px',
            height: 44,
            px: 2,
            fontSize: 14,
            fontWeight: 500,
            color: INK,
            bgcolor: PAPER,
            border: `1px solid ${HAIRLINE_STRONG}`,
            '&:hover': { bgcolor: HOVER },
            '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
          }}
        >
          {t('Leave anyway')}
        </ButtonBase>
      </Box>
    </Dialog>
  );
}
