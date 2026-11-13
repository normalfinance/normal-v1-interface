'use client';

import type { ReactNode } from 'react';
import type { Bucket } from '@/lib/metrics/periods';

import { fCurrency } from '@/utils/format-number';
import { CHAINS, isChainId } from '@/lib/chains/registry';
import { PRE_RECORDING_FEES } from '@/lib/metrics/snapshot';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';

// ----------------------------------------------------------------------
// Pieces shared by /dashboard and /dashboard/team.
// ----------------------------------------------------------------------

export const PRODUCT_LABEL: Record<string, string> = {
  savings: 'Savings',
  cctp: 'CCTP',
  soroswap: 'Soroswap',
  lifi: 'LI.FI',
  send: 'Sends',
  ramp: 'Buy and sell',
  [PRE_RECORDING_FEES]: 'LI.FI, before recording',
};

// One colour per product, the same on every chart, from the validated
// categorical order (dataviz reference palette; light and dark steps).
const PRODUCT_COLOR: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    savings: '#2a78d6',
    cctp: '#eb6834',
    soroswap: '#1baf7a',
    lifi: '#eda100',
    send: '#e87ba4',
    ramp: '#008300',
    [PRE_RECORDING_FEES]: '#6250d6',
  },
  dark: {
    savings: '#3987e5',
    cctp: '#d95926',
    soroswap: '#199e70',
    lifi: '#c98500',
    send: '#d55181',
    ramp: '#008300',
    [PRE_RECORDING_FEES]: '#9085e9',
  },
};

const FALLBACK_COLOR = '#8a8a8a';

export const productLabel = (product: string) => PRODUCT_LABEL[product] ?? product;
export const chainColor = (chain: string) =>
  isChainId(chain) ? CHAINS[chain].brandColor : FALLBACK_COLOR;
export const chainLabel = (chain: string) => (isChainId(chain) ? CHAINS[chain].name : chain);

function useIsDark(): boolean {
  const { mode, systemMode } = useColorScheme();
  return (mode === 'system' ? systemMode : mode) === 'dark';
}

export function useProductColor() {
  const palette = PRODUCT_COLOR[useIsDark() ? 'dark' : 'light'];
  return (product: string) => palette[product] ?? FALLBACK_COLOR;
}

// ---------------------------------------------------------------------- formats

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fMoney = (value: number) =>
  fCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fMoneyShort = (value: number) =>
  fCurrency(value, { notation: 'compact', maximumFractionDigits: 1 });

/** "13 Nov 2026, 05:09 UTC", the same on the server and in every browser. */
export function fUtc(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

/** A bar's period in words: "13 Nov 2026", "Week of 9 Nov 2026", "Nov 2026". */
export function fBucket(time: number, bucket: Bucket): string {
  const d = new Date(time);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (bucket === 'week') return `Week of ${day}`;
  if (bucket === 'month') return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return day;
}

export function fLogDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace('T', ' ');
}

export function shortAddress(value: string): string {
  return value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/** Saves text as a file; the byte-order mark makes Excel read UTF-8. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(
    new Blob([BYTE_ORDER_MARK, csv], { type: 'text/csv;charset=utf-8' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------- layout

export function Panel({
  title,
  subheader,
  action,
  children,
  wide,
}: {
  title: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Card
      sx={{
        p: { xs: 2, md: 3 },
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        gridColumn: wide ? { md: '1 / -1' } : undefined,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          {subheader && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {subheader}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Card>
  );
}

export function PanelGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 3 },
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      {children}
    </Box>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 3 },
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
        mb: { xs: 2, md: 3 },
      }}
    >
      {children}
    </Box>
  );
}

export function Kpi({ label, value, foot }: { label: string; value: string; foot?: string }) {
  return (
    <Card sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h4" component="p" sx={{ mt: 1, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
      {foot && (
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {foot}
        </Typography>
      )}
    </Card>
  );
}

export function SectionTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <Box sx={{ mt: { xs: 5, md: 7 }, mb: { xs: 2, md: 3 } }}>
      <Typography variant="h4" component="h2">
        {title}
      </Typography>
      {intro && (
        <Typography sx={{ color: 'text.secondary', mt: 1, maxWidth: 760 }}>{intro}</Typography>
      )}
    </Box>
  );
}

export function NoData({ text = 'No data yet' }: { text?: string }) {
  return (
    <Box
      sx={{
        height: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}
