'use client';

import type { ReactNode } from 'react';
import type { Activity } from '@/types/activity';
import type { Token } from '@normalfinance/types';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useTabs } from 'minimal-shared/hooks';
import { fCurrencyTwoDecimals } from '@/utils/format-number';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';

import TokensTab from './tokens-tab';
import ActivityTab from './activity-tab';

// ----------------------------------------------------------------------

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
} as const;

export interface WalletSection {
  /** Section header, e.g. "Normal wallet" / "Connected wallet". */
  label: string;
  /** The wallet's Stellar (or primary) address, shown shortened. */
  address: string;
  /** Pre-filtered tokens belonging to THIS wallet. */
  tokens: Token[];
  /** #74: per-wallet readiness notice (missing trustline / not activated),
   *  rendered under THIS wallet's tab only — the fix action must belong to
   *  the wallet it is shown for. */
  notice?: ReactNode;
}

export interface ConnectedWalletProps {
  address: string;
  balance?: number;
  savingsValue?: number;
  savingsFetching?: boolean;
  tokensFetching?: boolean;
  percentageChange?: number;
  tokens?: Token[];
  /** #32 chunk 2: dual-wallet display — when present, the assets tab renders
   *  one labeled group per wallet (doc 72 §4f) instead of the flat list. */
  sections?: WalletSection[];
  /** #74: readiness notice for single-wallet mode (no sections). */
  walletNotice?: ReactNode;
  activity?: Activity[];
  bitcoinAddress?: string | null;
}

export default function ConnectedWallet({
  address: _address,
  balance = 0,
  savingsValue = 0,
  savingsFetching = false,
  tokensFetching = false,
  tokens,
  sections,
  walletNotice,
  activity,
}: ConnectedWalletProps) {
  const { t } = useTranslate();
  const router = useRouter();
  // Same Buy / Sell / Send / Receive flows as the hero portfolio card.
  const { startAction } = useAssetActionsContext();

  const actionButtons: { label: string; icon: ReactNode; onClick: () => void }[] = [
    {
      label: t('Buy'),
      icon: <Iconify icon="ic:round-add" width={16} />,
      onClick: () => startAction('buy'),
    },
    {
      label: t('Sell'),
      icon: <Iconify icon="ic:round-remove" width={16} />,
      onClick: () => startAction('sell'),
    },
    {
      label: t('Send'),
      icon: <Iconify icon="ic:round-arrow-upward" width={16} />,
      onClick: () => startAction('send'),
    },
    {
      label: t('Receive'),
      icon: <Iconify icon="ic:round-arrow-downward" width={16} />,
      onClick: () => startAction('receive'),
    },
  ];

  const tabs = useTabs('assets');
  // #32: selected wallet tab in dual-wallet mode (0 = Normal wallet).
  const [walletTab, setWalletTab] = useState(0);

  const TAB_ITEMS = [
    { value: 'assets', label: t('Assets') },
    { value: 'activity', label: t('Activity') },
  ] as const;

  return (
    <Stack spacing={2} sx={{ width: 1 }} mt={2}>
      <Box
        sx={{
          width: 1,
          borderRadius: '16px',
          border: '1px solid rgba(10,10,15,0.08)',
          bgcolor: '#fff',
          p: '4px 4px 12px',
        }}
      >
        {/* Total row */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: '14px', pt: '12px', pb: '12px' }}
        >
          <Typography sx={{ fontSize: '14px', color: '#2A2A33', fontWeight: 500 }}>
            {t('Total balance')}
          </Typography>
          {savingsFetching || tokensFetching ? (
            <Skeleton variant="text" width={90} height={28} />
          ) : (
            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 400,
                lineHeight: 1.2,
                ...MONO,
                letterSpacing: '-0.02em',
              }}
            >
              {fCurrencyTwoDecimals(balance + savingsValue)}
            </Typography>
          )}
        </Stack>

        <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)', mx: '14px' }} />

        {/* Assets row */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: '14px', py: '12px' }}
        >
          <Typography sx={{ fontSize: '13.5px', color: '#6B6B76' }}>{t('Assets')}</Typography>
          {tokensFetching ? (
            <Skeleton variant="text" width={60} height={22} />
          ) : (
            <Typography
              sx={{ fontSize: '15px', fontWeight: 400, ...MONO, letterSpacing: '-0.01em' }}
            >
              {fCurrencyTwoDecimals(balance)}
            </Typography>
          )}
        </Stack>

        <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)', mx: '14px' }} />

        {/* Savings row → /savings */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          role="button"
          tabIndex={0}
          onClick={() => router.push(paths.savings)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push(paths.savings);
          }}
          sx={{
            px: '14px',
            py: '12px',
            cursor: 'pointer',
            borderRadius: '8px',
            transition: 'background 150ms',
            '&:hover': { bgcolor: 'rgba(10,10,15,0.03)' },
          }}
        >
          <Typography sx={{ fontSize: '13.5px', color: '#6B6B76' }}>{t('Savings')}</Typography>
          {savingsFetching ? (
            <Skeleton variant="text" width={60} height={24} />
          ) : (
            <Typography
              sx={{ fontSize: '15px', fontWeight: 400, ...MONO, letterSpacing: '-0.01em' }}
            >
              {fCurrencyTwoDecimals(savingsValue)}
            </Typography>
          )}
        </Stack>

        {/* Action buttons — Buy / Sell / Send / Receive */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            mt: '12px',
            mx: '8px',
          }}
        >
          {actionButtons.map((btn) => (
            <Box
              key={btn.label}
              component="button"
              onClick={btn.onClick}
              sx={{
                appearance: 'none',
                border: '1px solid rgba(10,10,15,0.08)',
                borderRadius: '12px',
                padding: '12px 6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#6B6B76',
                background: 'transparent',
                transition: 'all .15s ease',
                '&:hover': {
                  bgcolor: 'rgba(10,10,15,0.03)',
                  color: '#0A0A0F',
                  borderColor: 'rgba(10,10,15,0.14)',
                },
                '&:hover .action-icon-box': { bgcolor: '#0A0A0F', color: '#fff' },
              }}
            >
              <Box
                className="action-icon-box"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '8px',
                  bgcolor: '#F4F4F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0A0A0F',
                  transition: 'all .15s ease',
                }}
              >
                {btn.icon}
              </Box>
              {btn.label}
            </Box>
          ))}
        </Box>
      </Box>

      <Tabs
        value={tabs.value}
        onChange={tabs.onChange}
        variant="standard"
        sx={{
          mt: 2,
          minHeight: 0,
          borderBottom: '1px solid rgba(10,10,15,0.08)',
          '& .MuiTabs-flexContainer': { gap: '4px', padding: 0 },
          '& .MuiTab-root': {
            fontSize: '13.5px',
            fontWeight: 500,
            color: '#6B6B76',
            padding: '10px 14px',
            minHeight: 0,
            textTransform: 'none',
            transition: 'color .15s ease',
          },
          '& .MuiTab-root.Mui-selected': { color: '#0A0A0F' },
          '& .MuiTabs-indicator': {
            height: '2px',
            backgroundColor: '#0A0A0F',
            boxShadow: 'none !important',
          },
        }}
      >
        {TAB_ITEMS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {/* ------- tab panels ---------------------------------------- */}
      {tabs.value === 'assets' &&
        (sections && sections.length > 0 ? (
          // Dual-wallet mode: one WALLET TAB per wallet (Niko's direction —
          // stacked groups read as one continuous list). Numbers are never
          // summed across wallets: each tab shows exactly what that wallet
          // can spend (doc 72 §4f).
          <Box>
            <Stack direction="row" spacing={0.75} sx={{ mb: '10px' }}>
              {sections.map((section, idx) => {
                const selected = Math.min(walletTab, sections.length - 1) === idx;
                return (
                  <Box
                    key={section.address}
                    component="button"
                    onClick={() => setWalletTab(idx)}
                    sx={{
                      appearance: 'none',
                      border: selected
                        ? '1px solid rgba(10,10,15,0.9)'
                        : '1px solid rgba(10,10,15,0.1)',
                      borderRadius: '999px',
                      px: '12px',
                      py: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      bgcolor: selected ? '#0A0A0F' : 'transparent',
                      color: selected ? '#fff' : '#6B6B76',
                      transition: 'all .15s ease',
                      '&:hover': selected ? {} : { borderColor: 'rgba(10,10,15,0.25)' },
                    }}
                  >
                    {t(section.label)}
                  </Box>
                );
              })}
            </Stack>
            {(() => {
              const active = sections[Math.min(walletTab, sections.length - 1)];
              return (
                <Box>
                  <Typography
                    sx={{ fontSize: '11px', color: '#9A9AA5', px: '8px', pb: '2px', ...MONO }}
                  >
                    {`${active.address.slice(0, 6)}…${active.address.slice(-6)}`}
                  </Typography>
                  {active.notice && <Box sx={{ pb: '8px' }}>{active.notice}</Box>}
                  {active.tokens.length > 0 ? (
                    <TokensTab loading={tokensFetching} tokens={active.tokens} />
                  ) : (
                    <Typography sx={{ fontSize: '13px', color: '#9A9AA5', px: '8px', py: '18px' }}>
                      {t('No assets in this wallet yet.')}
                    </Typography>
                  )}
                </Box>
              );
            })()}
          </Box>
        ) : (
          <Box>
            {walletNotice && <Box sx={{ pb: '8px' }}>{walletNotice}</Box>}
            <TokensTab
              loading={tokensFetching}
              tokens={tokens?.filter(
                (tkn) => BigNumber(tkn.balance).gt(0) || tkn.contract === '__btc__'
              )}
            />
          </Box>
        ))}
      {tabs.value === 'activity' && <ActivityTab activity={activity} />}
    </Stack>
  );
}
