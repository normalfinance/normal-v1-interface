'use client';

import type { ReactNode } from 'react';
import type { RunPhase, RunState, FlowPlan, FlowSummary } from '@/lib/flow/types';

import { useTranslate } from '@/locales';
import { RouterLink } from '@/routes/components';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { placesOf, progressOf, moneyPosition, waitingOnPerson } from '@/lib/flow/run';
import {
  INK,
  HOVER,
  MUTED,
  PAPER,
  CANVAS,
  INK_SOFT,
  BRAND_COLORS,
  HAIRLINE_STRONG,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';

import { HAIRLINE } from '../brand';
import { FlowJourney } from './flow-journey';
import { FlowLeaveGuard } from './flow-leave-guard';
import { Elapsed, formatDuration } from './flow-time';
import { BOX_PX, FIGURES, AppBlock, ROW_LINES, appLocale } from '../app-ui';

// ---------------------------------------------------------------------------
// The page a deposit, withdrawal or swap opens on, inside the app (the sidebar
// stays). It reads top to bottom the way a bank's transfer review does:
//
//   what you are doing          the title and one sentence
//   where your money is now     one box, updated as it moves
//   every step  |  summary      the journey beside the figures and the button
//
// Nothing happens until the person presses the confirm button here. Then the
// same page follows the money to the end: each step lights up as it happens,
// with its time and a link to the network's own record of it.
// ---------------------------------------------------------------------------

export interface FlowAction {
  label: string;
  onClick?: () => void;
  /** A page in the app: the action is a link. */
  href?: string;
  primary?: boolean;
  /** After the action, the page closes back to the form (where it continues). */
  leave?: boolean;
}

export interface FlowViewProps {
  plan: FlowPlan;
  run: RunState;
  summary: FlowSummary;
  /** The page title in each phase: "Review your swap", "Swapping", "Swap complete". */
  titles: Record<RunPhase, string>;
  /** One sentence under the title: "25 USDC for about 0.00029 BTC". */
  lede?: ReactNode;
  confirm: {
    label: string;
    onClick: () => void;
    /** Why it cannot be pressed right now ("Getting a fresh price…"). */
    blocked?: string | null;
    /** Pressed, and the first prompt (2FA, consent) is on its way. */
    busy?: boolean;
  };
  back: { label: string; onClick: () => void };
  /** After a run: "Make another swap", "See it in Activity". */
  doneActions?: FlowAction[];
  /** Under "Done in 12s": where the money ended up, in words. */
  doneNote?: string;
  /** After a failure: "Try again", "Bring back as USDC". */
  failActions?: FlowAction[];
  /** Above the steps: an offer or an explanation that belongs to this run. */
  notice?: ReactNode;
  /** While running: can the person leave this page without parking the money? */
  leave: { safe: boolean; message: string };
  /**
   * The panel's title once this page's part is over (handed off): "On its way"
   * unless the swap now waits on the person ("Your swap needs you").
   */
  handOffTitle?: string;
}

const RED = '#B91C1C';

function Button({
  children,
  onClick,
  href,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  const link = href ? { component: RouterLink, href } : { onClick };
  return (
    <ButtonBase
      {...link}
      disabled={disabled}
      sx={{
        width: '100%',
        height: 48,
        px: 2,
        gap: 1,
        fontSize: 15,
        fontWeight: 500,
        border: `1px solid ${primary ? INK : HAIRLINE_STRONG}`,
        color: primary ? PAPER : INK,
        bgcolor: primary ? INK : PAPER,
        '&:hover': { bgcolor: primary ? INK_SOFT : HOVER },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
        '&.Mui-disabled': {
          bgcolor: 'rgba(10,10,15,0.08)',
          borderColor: 'transparent',
          color: '#9A9AA3',
        },
      }}
    >
      {children}
    </ButtonBase>
  );
}

function PositionBox({ plan, run }: { plan: FlowPlan; run: RunState }) {
  const { t } = useTranslate();
  const position = moneyPosition(plan, run);
  const places = placesOf(plan);
  const at = places.find((p) => p.id === position?.placeId) ?? places[0];
  const to = places.find((p) => p.id === position?.toPlaceId) ?? null;
  const { done, total } = progressOf(plan, run);
  const share = total ? Math.round((done / total) * 100) : 0;

  const label =
    run.phase === 'review'
      ? t('Your money is in')
      : run.phase === 'done'
        ? t('Your money arrived in')
        : run.phase === 'stopped'
          ? t('Your money is back in')
          : position?.moving && to
            ? t('Your money is on its way to')
            : t('Your money is in');
  const place = position?.moving && to ? to : at;
  const sub =
    run.phase === 'review'
      ? t('Nothing moves until you confirm.')
      : position?.moving && to
        ? // 'Your Base address' reads 'From your Base address' mid-sentence.
          t('From {{place}}', { place: at?.label?.replace(/^Your /, 'your ') })
        : [place?.amount, place?.detail].filter(Boolean).join(' · ');

  return (
    <Box
      component="section"
      aria-live="polite"
      aria-label={t('Where your money is')}
      sx={{
        bgcolor: PAPER,
        pb: { xs: 2, md: 2.5 },
        borderBottom: HAIRLINE,
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(220px, 280px)' },
        alignItems: 'center',
        gap: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, color: MUTED }}>{label}</Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: { xs: 22, md: 26 },
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: INK,
          }}
        >
          {place?.label}
        </Typography>
        {sub && (
          <Typography sx={{ ...FIGURES, mt: 0.75, fontSize: 14, lineHeight: 1.5, color: MUTED }}>
            {sub}
          </Typography>
        )}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ ...FIGURES, fontSize: 13.5, color: MUTED }}>
            {run.phase === 'review'
              ? t('{{n}} steps', { n: total })
              : t('{{done}} of {{total}} steps', { done, total })}
          </Typography>
          <Typography sx={{ ...FIGURES, fontSize: 13.5, color: INK, fontWeight: 500 }}>
            {run.phase === 'running' && run.startedAt ? (
              <Elapsed since={run.startedAt} />
            ) : run.startedAt && run.endedAt ? (
              formatDuration(run.endedAt - run.startedAt)
            ) : null}
          </Typography>
        </Box>
        {/* A plain track: ink for what is done, no motion. */}
        <Box
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          sx={{ mt: 1, height: 4, bgcolor: CANVAS }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${run.phase === 'done' ? 100 : share}%`,
              bgcolor:
                run.phase === 'failed' ? RED : run.phase === 'done' ? BRAND_COLORS.mint.deep : INK,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

function SummaryRows({ summary }: { summary: FlowSummary }) {
  return (
    <Box component="dl" sx={{ m: 0, ...ROW_LINES }}>
      {summary.rows.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            px: BOX_PX,
            py: 1.5,
          }}
        >
          <Typography component="dt" sx={{ fontSize: 14, color: MUTED, flexShrink: 0 }}>
            {row.asset && (
              // Inline, so the label keeps the row's baseline beside the value.
              <Box
                component="img"
                src={getCryptoIconUrl(row.asset)}
                alt=""
                sx={{
                  width: 20,
                  height: 20,
                  mr: 1,
                  verticalAlign: '-5px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            )}
            {row.label}
          </Typography>
          <Box component="dd" sx={{ m: 0, minWidth: 0, textAlign: 'right' }}>
            <Typography
              sx={{
                ...FIGURES,
                fontSize: 14.5,
                fontWeight: 500,
                color: row.caution ? BRAND_COLORS.yellow.deep : INK,
                overflowWrap: 'anywhere',
                ...(row.mono && {
                  fontFamily: '"Geist Mono", ui-monospace, monospace',
                  fontSize: 13.5,
                }),
              }}
            >
              {row.value}
            </Typography>
            {row.detail && (
              <Typography sx={{ ...FIGURES, mt: '2px', fontSize: 13, color: MUTED }}>
                {row.detail}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * A note that belongs to this run, above the steps: the price moved, an offer
 * to finish by itself, why the money is on its way back. Grey, never alarm.
 */
export function FlowNotice({
  children,
  action,
}: {
  children: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        border: `1px solid ${HAIRLINE_STRONG}`,
        bgcolor: CANVAS,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 14, lineHeight: 1.55, color: INK }}>{children}</Typography>
      {action && (
        <ButtonBase
          onClick={action.onClick}
          sx={{
            flexShrink: 0,
            height: 40,
            px: 1.75,
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            color: INK,
            bgcolor: PAPER,
            border: `1px solid ${HAIRLINE_STRONG}`,
            '&:hover': { bgcolor: HOVER },
            '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
          }}
        >
          {action.label}
        </ButtonBase>
      )}
    </Box>
  );
}

function Panel({ tone, children }: { tone: 'neutral' | 'failed' | 'done'; children: ReactNode }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.75,
        border: `1px solid ${tone === 'failed' ? 'rgba(185,28,28,0.24)' : HAIRLINE_STRONG}`,
        bgcolor:
          tone === 'failed'
            ? 'rgba(185,28,28,0.04)'
            : tone === 'done'
              ? BRAND_COLORS.mint.tint
              : CANVAS,
      }}
    >
      {children}
    </Box>
  );
}

function Actions({ actions }: { actions: FlowAction[] }) {
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {actions.map((a) => (
        <Button key={a.label} primary={a.primary} onClick={a.onClick} href={a.href}>
          {a.label}
        </Button>
      ))}
    </Box>
  );
}

export function FlowView({
  plan,
  run,
  summary,
  titles,
  lede,
  confirm,
  back,
  doneActions = [],
  doneNote,
  failActions = [],
  notice,
  leave,
  handOffTitle,
}: FlowViewProps) {
  const { t } = useTranslate();
  const { phase } = run;
  const running = phase === 'running';
  const waiting = waitingOnPerson(run);
  const time = (ms: number | null) =>
    ms
      ? new Intl.DateTimeFormat(appLocale(), { hour: 'numeric', minute: '2-digit' }).format(ms)
      : null;

  const journeyLabels = {
    here: t('Your money is here'),
    incoming: t('On its way here'),
    arrived: t('Arrived'),
    yours: t('Yours'),
    waitingForYou: t('Waiting for you'),
    onItsWay: t('On its way'),
    notNeeded: t('Not needed'),
  };

  const action =
    phase === 'review' ? (
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        <Button primary onClick={confirm.onClick} disabled={!!confirm.blocked || confirm.busy}>
          {confirm.busy && <CircularProgress size={16} sx={{ color: 'inherit' }} />}
          {confirm.label}
        </Button>
        <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: MUTED }}>
          {confirm.blocked ??
            t('Nothing moves until you confirm. Turning down any prompt stops it, at no cost.')}
        </Typography>
        <Button onClick={back.onClick}>{t('Edit')}</Button>
      </Box>
    ) : running ? (
      <Panel tone="neutral">
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: INK }}>
          {waiting
            ? t('Check your passkey or wallet prompt')
            : leave.safe
              ? t('You can leave this page')
              : t('Keep this page open')}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 13.5, lineHeight: 1.55, color: MUTED }}>
          {waiting ? t('The next step waits for your approval.') : leave.message}
        </Typography>
      </Panel>
    ) : phase === 'done' || phase === 'handed-off' ? (
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        <Panel tone={phase === 'done' ? 'done' : 'neutral'}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 500,
              color: phase === 'done' ? BRAND_COLORS.mint.deep : INK,
            }}
          >
            {phase === 'done'
              ? run.startedAt && run.endedAt
                ? t('Done in {{time}}', { time: formatDuration(run.endedAt - run.startedAt) })
                : t('Done')
              : (handOffTitle ?? t('On its way'))}
          </Typography>
          {(run.ending ?? doneNote) && (
            <Typography sx={{ mt: 0.5, fontSize: 13.5, lineHeight: 1.55, color: INK_SOFT }}>
              {run.ending ?? doneNote}
            </Typography>
          )}
        </Panel>
        <Actions actions={doneActions} />
      </Box>
    ) : phase === 'failed' ? (
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        <Panel tone="failed">
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: RED }}>
            {t('This did not go through')}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5, lineHeight: 1.55, color: INK_SOFT }}>
            {run.error}
          </Typography>
        </Panel>
        <Actions actions={failActions} />
        <Button onClick={back.onClick}>{back.label}</Button>
      </Box>
    ) : (
      // stopped: it ended early and nothing is wrong.
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        <Panel tone="neutral">
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: INK }}>
            {t('Nothing was lost')}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5, lineHeight: 1.55, color: INK_SOFT }}>
            {run.ending}
          </Typography>
        </Panel>
        <Button primary onClick={back.onClick}>
          {back.label}
        </Button>
      </Box>
    );

  return (
    <Box sx={{ pb: { xs: 4, md: 6 } }}>
      <FlowLeaveGuard
        active={running && !leave.safe}
        title={t('Leave while it is running?')}
        message={leave.message}
      />

      {/* Back, while there is somewhere to go back to. */}
      <Box sx={{ minHeight: 36, mb: 1 }}>
        {!running && (
          <ButtonBase
            onClick={back.onClick}
            sx={{
              gap: 0.25,
              ml: -0.75,
              px: 0.75,
              py: 0.5,
              fontSize: 14,
              fontWeight: 500,
              color: INK,
              '&:hover': { bgcolor: HOVER },
              '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
            }}
          >
            <ChevronLeftRounded sx={{ fontSize: 20 }} />
            {back.label}
          </ButtonBase>
        )}
      </Box>

      {/* What this is. */}
      <Box sx={{ mb: 3 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 24, md: 28 },
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            color: INK,
          }}
        >
          {titles[phase]}
        </Typography>
        {lede && (
          <Typography sx={{ ...FIGURES, mt: 0.75, fontSize: 15, lineHeight: 1.5, color: MUTED }}>
            {lede}
            {run.startedAt && phase !== 'review'
              ? ` · ${t('Started at {{time}}', { time: time(run.startedAt) })}`
              : ''}
          </Typography>
        )}
      </Box>

      <PositionBox plan={plan} run={run} />

      {notice && <Box sx={{ mt: 2 }}>{notice}</Box>}

      <Box
        sx={{
          mt: { xs: 3, md: 4 },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' },
          alignItems: 'start',
          gap: { xs: 3, lg: 3 },
        }}
      >
        <AppBlock
          title={t('Every step')}
          action={
            <Typography sx={{ fontSize: 13.5, color: MUTED }}>
              {t('Where your money is at each one')}
            </Typography>
          }
          flush
          sx={{ order: { xs: phase === 'review' ? 2 : 1, lg: 1 } }}
        >
          <FlowJourney plan={plan} run={run} labels={journeyLabels} />
        </AppBlock>

        <AppBlock
          title={t('Summary')}
          flush
          framed
          sx={{ order: { xs: phase === 'review' ? 1 : 2, lg: 2 } }}
        >
          <SummaryRows summary={summary} />
          <Box sx={{ borderTop: HAIRLINE, px: BOX_PX, py: BOX_PX }}>
            {action}
            {summary.note && phase === 'review' && (
              <Typography sx={{ mt: 1.5, fontSize: 12.5, lineHeight: 1.55, color: MUTED }}>
                {summary.note}
              </Typography>
            )}
          </Box>
        </AppBlock>
      </Box>
    </Box>
  );
}
