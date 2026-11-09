'use client';

import type { RunState, FlowPlan, StepState, FlowPlace, FlowStepDef } from '@/lib/flow/types';

import { cdn, getCryptoIconUrl } from '@normalfinance/utils';
import { stepsOf, statusOf, moneyPosition } from '@/lib/flow/run';
import {
  INK,
  MUTED,
  PAPER,
  CANVAS,
  INK_SOFT,
  BRAND_COLORS,
  HAIRLINE_STRONG,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import HubOutlined from '@mui/icons-material/HubOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';

import { HAIRLINE } from '../brand';
import { Elapsed, formatDuration } from './flow-time';
import { BOX_PX, FIGURES, StatusBadge } from '../app-ui';

// ---------------------------------------------------------------------------
// The journey: every place the money can be, as a grey band (the way groups
// sit in the holdings table), with the steps between them on a numbered rail.
// The band the money is at says so ("Your money is here"); a step that moves
// it says it is on its way. Colour only for meaning: done is green, waiting
// on you is yellow, a failure is red. Everything else is ink and grey.
// ---------------------------------------------------------------------------

const RED = '#B91C1C';
const RAIL_X = 11; // centre of the 22px marker

// Up to three coins in the 32px slot every place icon takes, so the text
// column stays straight: one above, two below, each ringed in white.
const CLUSTER = [
  { left: 6.5, top: 0 },
  { left: 0, top: 13 },
  { left: 13, top: 13 },
];

function PlaceIcon({ place }: { place: FlowPlace }) {
  if (place.assets?.length) {
    return (
      <Box aria-hidden="true" sx={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
        {place.assets.slice(0, CLUSTER.length).map((symbol, i) => (
          <Avatar
            key={symbol}
            src={getCryptoIconUrl(symbol)}
            alt=""
            sx={{
              position: 'absolute',
              ...CLUSTER[i],
              width: 19,
              height: 19,
              bgcolor: PAPER,
              border: `1.5px solid ${PAPER}`,
            }}
          />
        ))}
      </Box>
    );
  }
  if (place.glyph) {
    const Icon =
      place.glyph === 'vault'
        ? SavingsOutlined
        : place.glyph === 'bridge'
          ? HubOutlined
          : place.glyph === 'wallets'
            ? AccountBalanceWalletOutlined
            : SwapHorizRounded;
    return (
      <Box
        aria-hidden="true"
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: INK,
          bgcolor: PAPER,
          border: HAIRLINE,
          '& svg': { fontSize: 17 },
        }}
      >
        <Icon />
      </Box>
    );
  }
  const badge = place.asset === 'USDC' && place.network === 'stellar';
  return (
    <Box aria-hidden="true" sx={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
      <Avatar
        src={place.asset ? getCryptoIconUrl(place.asset) : undefined}
        alt=""
        sx={{ width: 32, height: 32, bgcolor: PAPER }}
      />
      {badge && (
        <Box
          component="img"
          src={cdn('tokens/XLM.webp')}
          alt=""
          sx={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 15,
            height: 15,
            borderRadius: '50%',
            border: `1.5px solid ${PAPER}`,
            bgcolor: PAPER,
            objectFit: 'cover',
          }}
        />
      )}
    </Box>
  );
}

function Tag({ tone, children }: { tone: 'ink' | 'done' | 'muted'; children: string }) {
  const colors =
    tone === 'ink'
      ? { color: PAPER, bgcolor: INK }
      : tone === 'done'
        ? { color: BRAND_COLORS.mint.deep, bgcolor: BRAND_COLORS.mint.tint }
        : { color: MUTED, bgcolor: PAPER, border: `1px solid ${HAIRLINE_STRONG}` };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        px: '6px',
        py: '1px',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        ...colors,
      }}
    >
      {children}
    </Box>
  );
}

function PlaceRow({
  place,
  here,
  incoming,
  arrived,
  labels,
}: {
  place: FlowPlace;
  here: boolean;
  incoming: boolean;
  arrived: boolean;
  labels: JourneyLabels;
}) {
  const tag = arrived ? (
    <Tag tone="done">{labels.arrived}</Tag>
  ) : here ? (
    <Tag tone="ink">{labels.here}</Tag>
  ) : incoming ? (
    <StatusBadge tone="pending">{labels.incoming}</StatusBadge>
  ) : null;

  return (
    <Box
      role="listitem"
      aria-current={here ? 'location' : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: BOX_PX,
        py: 1.5,
        bgcolor: CANVAS,
        borderTop: HAIRLINE,
        borderBottom: HAIRLINE,
        '&:first-of-type': { borderTop: 'none' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <PlaceIcon place={place} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography component="span" sx={{ fontSize: 15, fontWeight: 500, color: INK }}>
            {place.label}
          </Typography>
          {place.own && <Tag tone="muted">{labels.yours}</Tag>}
        </Box>
        {(place.detail || place.address) && (
          <Typography
            component="span"
            sx={{ display: 'block', mt: '2px', fontSize: 13, lineHeight: 1.45, color: MUTED }}
          >
            {place.address &&
              (place.href ? (
                <Link
                  href={place.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ color: INK_SOFT, fontFamily: '"Geist Mono", ui-monospace, monospace' }}
                >
                  {place.address}
                </Link>
              ) : (
                <Box
                  component="span"
                  sx={{ color: INK_SOFT, fontFamily: '"Geist Mono", ui-monospace, monospace' }}
                >
                  {place.address}
                </Box>
              ))}
            {place.address && place.detail ? ' · ' : ''}
            {place.detail}
          </Typography>
        )}
        {tag && <Box sx={{ mt: 0.75, display: { xs: 'block', sm: 'none' } }}>{tag}</Box>}
      </Box>
      <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
        {place.amount && (
          <Typography sx={{ ...FIGURES, fontSize: 15, fontWeight: 500, color: INK }}>
            {place.amount}
          </Typography>
        )}
        {tag && <Box sx={{ mt: 0.5, display: { xs: 'none', sm: 'block' } }}>{tag}</Box>}
      </Box>
    </Box>
  );
}

function Marker({ number, state }: { number: number; state: StepState | undefined }) {
  const status = state?.status ?? 'upcoming';
  const base = {
    position: 'relative',
    zIndex: 1,
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11.5,
    fontWeight: 500,
    ...FIGURES,
    '& svg': { fontSize: 15 },
  } as const;

  if (status === 'done') {
    return (
      <Box sx={{ ...base, bgcolor: BRAND_COLORS.mint.tint, color: BRAND_COLORS.mint.deep }}>
        <CheckRounded />
      </Box>
    );
  }
  if (status === 'failed') {
    return (
      <Box sx={{ ...base, bgcolor: 'rgba(185,28,28,0.08)', color: RED }}>
        <CloseRounded />
      </Box>
    );
  }
  if (status === 'stopped' || status === 'skipped') {
    return (
      <Box sx={{ ...base, bgcolor: PAPER, color: MUTED, border: `1px dashed ${HAIRLINE_STRONG}` }}>
        <RemoveRounded />
      </Box>
    );
  }
  if (status === 'active') {
    // The step that is happening now turns (Niko 2026-11-09: a loading circle,
    // not just a number). Yellow while it waits on the person's prompt. Still
    // for people who ask for less motion: the ring alone still reads as busy.
    const waiting = !!state?.waiting;
    const ink = waiting ? BRAND_COLORS.yellow.deep : INK;
    return (
      <Box
        role="img"
        aria-label={waiting ? 'Waiting for you' : 'In progress'}
        sx={{ ...base, bgcolor: waiting ? BRAND_COLORS.yellow.tint : PAPER }}
      >
        <Box
          component="svg"
          viewBox="0 0 22 22"
          aria-hidden="true"
          sx={{
            width: 22,
            height: 22,
            display: 'block',
            animation: 'nf-step-turn 0.9s linear infinite',
            '@keyframes nf-step-turn': { to: { transform: 'rotate(360deg)' } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <circle cx="11" cy="11" r="9.25" fill="none" stroke={HAIRLINE_STRONG} strokeWidth="1.5" />
          <path
            d="M11 1.75 A9.25 9.25 0 0 1 20.25 11"
            fill="none"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Box>
      </Box>
    );
  }
  return (
    <Box sx={{ ...base, bgcolor: PAPER, color: MUTED, border: `1px solid ${HAIRLINE_STRONG}` }}>
      {number}
    </Box>
  );
}

function StepRow({
  step,
  number,
  state,
  phase,
  moving,
  last,
  labels,
}: {
  step: FlowStepDef;
  number: number;
  state: StepState | undefined;
  phase: RunState['phase'];
  moving: boolean;
  /** The last row: the rail ends at its marker. */
  last: boolean;
  labels: JourneyLabels;
}) {
  const status = state?.status ?? 'upcoming';
  const settled = status === 'done' || status === 'skipped';
  const active = status === 'active';
  // Done steps keep their title and what happened; the explanation stays on
  // the steps still ahead, where it answers "what happens next?".
  const showDetail = !settled || phase === 'review';
  const duration =
    state?.startedAt && state?.endedAt && status === 'done'
      ? formatDuration(state.endedAt - state.startedAt)
      : null;

  const aside = active ? (
    state?.startedAt ? (
      <Elapsed since={state.startedAt} />
    ) : null
  ) : status === 'skipped' ? (
    labels.notNeeded
  ) : duration ? (
    duration
  ) : (
    step.eta
  );

  return (
    <Box
      role="listitem"
      aria-current={active ? 'step' : undefined}
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: { xs: '22px minmax(0, 1fr)', sm: '22px minmax(0, 1fr) auto' },
        columnGap: 1.75,
        px: BOX_PX,
        py: 1.5,
        // The rail: one grey line through every step, behind the markers.
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          // Marker centre: 12px row padding + 1px + half of 22px.
          ...(last ? { height: '24px' } : { bottom: 0 }),
          left: { xs: `calc(20px + ${RAIL_X}px)`, md: `calc(24px + ${RAIL_X}px)` },
          width: '1px',
          bgcolor: HAIRLINE_STRONG,
        },
      }}
    >
      <Box sx={{ pt: '1px' }}>
        <Marker number={number} state={state} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            component="span"
            sx={{
              fontSize: 14.5,
              fontWeight: 500,
              lineHeight: 1.45,
              color: status === 'upcoming' && phase !== 'review' ? MUTED : INK,
            }}
          >
            {step.title}
          </Typography>
          {step.optional && status !== 'done' && <Tag tone="muted">{step.optional}</Tag>}
          {active && state?.waiting && (
            <StatusBadge tone="pending">{labels.waitingForYou}</StatusBadge>
          )}
          {active && moving && !state?.waiting && (
            <StatusBadge tone="pending">{labels.onItsWay}</StatusBadge>
          )}
        </Box>

        {showDetail && (
          <Typography sx={{ mt: '2px', fontSize: 13.5, lineHeight: 1.5, color: MUTED }}>
            {step.detail}
          </Typography>
        )}

        {state?.note && (
          <Typography
            sx={{
              ...FIGURES,
              mt: '4px',
              fontSize: 13,
              lineHeight: 1.5,
              color: status === 'failed' ? RED : INK_SOFT,
            }}
          >
            {state.note}
          </Typography>
        )}

        {!!state?.links?.length && (
          <Box sx={{ mt: '4px', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {state.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  fontSize: 13,
                  fontWeight: 500,
                  color: INK,
                }}
              >
                {link.label}
                <NorthEastRounded sx={{ fontSize: 13 }} />
              </Link>
            ))}
          </Box>
        )}

        {/* Phones: who does it and how long, under the words. */}
        <Typography
          component="div"
          sx={{
            ...FIGURES,
            display: { xs: 'block', sm: 'none' },
            mt: '4px',
            fontSize: 12.5,
            color: MUTED,
          }}
        >
          {step.actor}
          {aside ? ' · ' : ''}
          {aside}
        </Typography>
      </Box>

      <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', pl: 1 }}>
        <Typography sx={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>
          {step.actor}
        </Typography>
        {aside && (
          <Typography
            component="div"
            sx={{
              ...FIGURES,
              mt: '2px',
              fontSize: 13,
              whiteSpace: 'nowrap',
              color: active ? INK : MUTED,
              fontWeight: active ? 500 : 400,
            }}
          >
            {aside}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export interface JourneyLabels {
  here: string;
  incoming: string;
  arrived: string;
  yours: string;
  waitingForYou: string;
  onItsWay: string;
  notNeeded: string;
}

export function FlowJourney({
  plan,
  run,
  labels,
}: {
  plan: FlowPlan;
  run: RunState;
  labels: JourneyLabels;
}) {
  const position = moneyPosition(plan, run);
  const numbers = new Map(stepsOf(plan).map((s, i) => [s.id, i + 1]));
  const lastPlaceId = [...plan.items].reverse().find((i) => i.kind === 'place');
  const lastId = lastPlaceId?.kind === 'place' ? lastPlaceId.place.id : null;

  const lastItem = plan.items[plan.items.length - 1];
  const lastStepId = lastItem?.kind === 'step' ? lastItem.step.id : null;

  return (
    <Box role="list">
      {plan.items.map((item) => {
        if (item.kind === 'place') {
          const isHere = !!position && position.placeId === item.place.id && !position.moving;
          return (
            <PlaceRow
              key={`place-${item.place.id}`}
              place={item.place}
              here={isHere && run.phase !== 'done'}
              arrived={run.phase === 'done' && item.place.id === lastId}
              incoming={!!position?.moving && position.toPlaceId === item.place.id}
              labels={labels}
            />
          );
        }
        const { step } = item;
        return (
          <StepRow
            key={step.id}
            step={step}
            number={numbers.get(step.id) ?? 0}
            state={run.steps[step.id]}
            phase={run.phase}
            moving={step.money === 'moving' && statusOf(run, step.id) === 'active'}
            last={step.id === lastStepId}
            labels={labels}
          />
        );
      })}
    </Box>
  );
}
