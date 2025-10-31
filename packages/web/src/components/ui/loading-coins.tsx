'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import {
  m,
  domMax,
  useInView, // 👈 add this
  LazyMotion,
  MotionConfig,
  useReducedMotion,
} from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// Token type
type TokenItem = { name: string; symbol: string; icon?: string; usdValue?: number };

type Props = {
  tokens: TokenItem[];
  widthPercent?: number;
  forceMotion?: boolean;
};

const fCurrency = (n?: number) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      })
    : '—';

export default function LoadingCoinsMouse({
  tokens,
  widthPercent = 30,
  forceMotion = false,
}: Props) {
  const { t } = useTranslate();
  const prefersReduced = useReducedMotion();
  const allowMotion = forceMotion || !prefersReduced;

  // 👇 reference and observer for "in view" detection
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: '-10% 0px' }); // starts slightly before visible

  const [statuses, setStatuses] = React.useState<Array<'idle' | 'loading' | 'done'>>(() =>
    tokens.map(() => 'idle')
  );

  // Timing constants
  const MOVE_DURATION = 2.2;
  const CLICK_START = 1.4;
  const TOKEN_STAGGER = 0.45;
  const TOKEN_SPIN = 0.7;
  const EXTRA_PAD = 1.2;

  const LOOP_DURATION = React.useMemo(
    () => MOVE_DURATION + tokens.length * (TOKEN_STAGGER + TOKEN_SPIN) + EXTRA_PAD,
    [tokens.length]
  );

  React.useEffect(() => {
    if (!allowMotion || !inView) return () => {}; // only run when visible

    let stop = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      while (!stop) {
        setStatuses(tokens.map(() => 'idle'));
        await sleep(CLICK_START * 1000);

        for (let i = 0; i < tokens.length && !stop; i++) {
          setStatuses((prev) => {
            const next = [...prev];
            next[i] = 'loading';
            return next;
          });
          await sleep(TOKEN_SPIN * 1000);

          setStatuses((prev) => {
            const next = [...prev];
            next[i] = 'done';
            return next;
          });
          await sleep(TOKEN_STAGGER * 1000);
        }

        const used = CLICK_START + tokens.length * (TOKEN_SPIN + TOKEN_STAGGER);
        const remaining = Math.max(0, LOOP_DURATION - used);
        await sleep(remaining * 1000);
      }
    })();

    return () => {
      stop = true;
    };
  }, [allowMotion, inView, tokens, LOOP_DURATION, CLICK_START, TOKEN_SPIN, TOKEN_STAGGER]);

  return (
    <MotionConfig reducedMotion={forceMotion ? 'never' : 'user'}>
      <LazyMotion features={domMax} strict>
        <Stack ref={ref} spacing={2} alignItems="flex-start">
          <Box
            sx={{
              width: `${Math.min(100, Math.max(10, widthPercent))}%`,
              minWidth: 220,
              maxWidth: 520,
              position: 'relative',
              overflow: 'visible',
            }}
          >
            <Box
              sx={{
                width: 143,
                height: 40,
                bgcolor: '#efd6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                position: 'relative',
              }}
            >
              <Typography sx={{ fontWeight: 600, lineHeight: 1 }}>{t('Buy all')}</Typography>

              {/* animate mouse only when inView */}
              <m.img
                src={cdn('about-page/Mouse.svg')}
                alt="Mouse"
                style={{
                  position: 'absolute',
                  right: -18,
                  bottom: -10,
                  width: 42,
                  height: 42,
                  transformOrigin: 'left bottom',
                  willChange: 'transform',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
                initial={{ translateX: 60, scale: 1 }}
                animate={
                  inView
                    ? {
                        translateX: [60, 0, 0, 60],
                        scale: [1, 1, 0.82, 1],
                      }
                    : { translateX: 60, scale: 1 }
                }
                transition={{
                  duration: MOVE_DURATION,
                  ease: 'easeInOut',
                  times: [0, 0.64, 0.78, 1],
                  repeat: Infinity,
                  repeatDelay: Math.max(0, LOOP_DURATION - MOVE_DURATION),
                }}
              />
            </Box>
          </Box>

          {/* Token list */}
          <Stack spacing={1.25} sx={{ width: '100%' }}>
            {tokens.map((tok, i) => (
              <Box
                key={tok.symbol}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: { xs: 1.5, md: 2 },
                  py: { xs: 1, md: 1.5 },
                  bgcolor: 'white',
                  borderRadius: 1.5,
                  border: '1px solid rgba(87,146,255,0.15)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tok.icon ? (
                    <Box
                      component="img"
                      src={tok.icon}
                      alt={tok.symbol}
                      sx={{ width: 28, height: 28 }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
                      }}
                    />
                  )}
                  <Typography fontWeight={500} color="text.secondary" sx={{ ml: 0.5 }}>
                    {tok.symbol}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={500}>{fCurrency(tok.usdValue)}</Typography>
                  <StatusBadge status={statuses[i]} />
                </Box>
              </Box>
            ))}
          </Stack>
        </Stack>
      </LazyMotion>
    </MotionConfig>
  );
}

function StatusBadge({ status }: { status: 'idle' | 'loading' | 'done' }) {
  if (status === 'loading') {
    return (
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: 'divider',
          borderTopColor: '#FFAC82',
          animation: 'spin 0.6s linear infinite',
          '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
        }}
      />
    );
  }

  if (status === 'done') {
    return (
      <Box
        component="img"
        src={cdn('about-page/check.svg')}
        alt="Done"
        sx={{ width: 18, height: 18, display: 'block' }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        bgcolor: 'action.hover',
      }}
    />
  );
}
