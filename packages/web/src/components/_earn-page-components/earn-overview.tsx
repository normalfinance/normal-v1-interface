'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { fCurrency, fRawPercent } from '@/utils/format-number';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import {
  Box,
  Card,
  Chip,
  Menu,
  Stack,
  Button,
  Divider,
  MenuItem,
  useTheme,
  Typography,
} from '@mui/material';

import DonutChart from '../ui/donut-chart';

// --------------------
// Types
// --------------------

export type EarnAssetKey = 'collateral' | 'liquidity' | 'blend';

export type EarnAllocationRow = {
  key: EarnAssetKey;
  label: string;
  icon?: React.ReactNode;
  balanceUsd?: number | null;
  apy?: number | null;
  showManage?: boolean;
};

export type EarnOverviewCardProps = {
  totalCapitalDeployedUsd: number;
  blendedYield: number;
  annualYieldUsd: number;
  totalEarningsUsd: number;
  earnedTodayUsd?: number;
  donutColors?: string[];
  bridgeButtonLabel?: string;
  bridgeHelperText?: string;
  rows: EarnAllocationRow[];
  onBridgeClick?: () => void;
  onCalculateClick?: () => void;
  onAllocateClick?: () => void;
  onRowAction?: (rowKey: EarnAssetKey, action: 'deposit' | 'withdraw' | 'info') => void;
  allocateCtaLabel?: string;
  currency?: string;
};

// --------------------
// Component
// --------------------

export function EarnOverviewCard(props: EarnOverviewCardProps) {
  const theme = useTheme();
  const { t } = useTranslate();

  const {
    totalCapitalDeployedUsd,
    blendedYield,
    annualYieldUsd,
    totalEarningsUsd,
    earnedTodayUsd,
    rows,
    donutColors,

    bridgeButtonLabel = t('Bridge USDC'),
    bridgeHelperText = t('From Ethereum, Arbitrum, Base + 4 more'),
    onBridgeClick,

    onCalculateClick,
    onRowAction,

    allocateCtaLabel = t('Allocate Capital'),
    onAllocateClick,

    currency = 'USD',
  } = props;

  const defaultColorByLabel: Record<string, string> = {
    Blend: '#20E3A2',
    Collateral: '#2775CA',
    Liquidity: '#BBD3FB',
  };

  const computedDonutSeries = React.useMemo(
    () =>
      rows.map((r) => ({
        label: r.label,
        value: r.balanceUsd ?? 0,
      })),
    [rows]
  );

  const computedDonutColors = React.useMemo(() => {
    if (donutColors?.length) return donutColors;
    return computedDonutSeries.map((s) => defaultColorByLabel[s.label] ?? '#CBD5E1');
  }, [donutColors, computedDonutSeries]);

  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [activeRowKey, setActiveRowKey] = React.useState<EarnAssetKey | null>(null);

  const openMenu = (e: React.MouseEvent<HTMLElement>, rowKey: EarnAssetKey) => {
    setMenuAnchor(e.currentTarget);
    setActiveRowKey(rowKey);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setActiveRowKey(null);
  };

  const handleRowAction = (action: 'deposit' | 'withdraw' | 'info') => {
    if (activeRowKey) onRowAction?.(activeRowKey, action);
    closeMenu();
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, md: 0 }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2, md: 6 }}
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
            flexWrap="wrap"
          >
            <MetricBlock
              label={t('Total Capital Deployed')}
              value={fCurrency(totalCapitalDeployedUsd)}
            />

            <MetricBlock label={t('Blended Yield')} value={fRawPercent(blendedYield)} />

            <MetricBlock
              label={t('Annual Yield')}
              value={fCurrency(annualYieldUsd)}
              action={
                <Button
                  onClick={onCalculateClick}
                  variant="text"
                  size="small"
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    ml: 1,
                    color: 'text.secondary',
                    fontWeight: 600,
                    textTransform: 'none',
                  }}
                  endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />}
                >
                  {t('Calculate')}
                </Button>
              }
            />

            <MetricBlock
              label={t('Total Earnings')}
              value={fCurrency(totalEarningsUsd)}
              valueSx={{
                background: theme.vars.customGradients.textRainbow,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
              }}
              action={
                earnedTodayUsd != null ? (
                  <Chip
                    label={`${fCurrency(earnedTodayUsd)} ${t('earned today')}`}
                    size="small"
                    sx={{
                      ml: 1,
                      bgcolor: 'rgba(0,0,0,0.04)',
                      color: 'text.secondary',
                      fontWeight: 600,
                    }}
                  />
                ) : null
              }
            />
          </Stack>

          <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
            <Button onClick={onBridgeClick} variant="gradientSoft">
              {t(bridgeButtonLabel)}
            </Button>

            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t(bridgeHelperText)}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems="stretch" sx={{ width: '100%' }}>
          <Box
            sx={{
              flex: { xs: '1 1 auto', md: '0 0 40%' },
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pr: { md: 4 },
            }}
          >
            <DonutChart
              totalValueUsd={totalCapitalDeployedUsd}
              series={computedDonutSeries}
              colors={computedDonutColors}
            />
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: '1px',
              bgcolor: 'divider',
              opacity: 0.8,
            }}
          />

          <Box sx={{ flex: 1, pl: { md: 4 }, minWidth: 0 }}>
            <Stack spacing={3}>
              {rows.map((row, idx) => (
                <React.Fragment key={row.key}>
                  <AllocationRow
                    label={row.label}
                    icon={
                      row.icon ?? (
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {row.key === 'liquidity' ? (
                            <BarChartRoundedIcon sx={{ fontSize: 22, color: 'text.primary' }} />
                          ) : (
                            <InfoOutlinedIcon
                              sx={{ fontSize: 22, color: 'text.primary', opacity: 0.75 }}
                            />
                          )}
                        </Box>
                      )
                    }
                    balanceUsd={row.balanceUsd}
                    apy={row.apy}
                    showManage={row.showManage}
                    onManageClick={(e) => openMenu(e, row.key)}
                  />
                  {idx !== rows.length - 1 && <Divider />}
                </React.Fragment>
              ))}

              <Button onClick={onAllocateClick} variant="darkSoft" fullWidth>
                {t(allocateCtaLabel)}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => handleRowAction('deposit')}>{t('Deposit')}</MenuItem>
        <MenuItem onClick={() => handleRowAction('withdraw')}>{t('Withdraw')}</MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => handleRowAction('info')}>{t('Info')}</MenuItem>
      </Menu>
    </Card>
  );
}

// --------------------
// Subcomponents
// --------------------

function MetricBlock({
  label,
  value,
  action,
  valueSx,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
  valueSx?: SxProps<Theme>;
}) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 180 }}>
      <Stack direction="row" alignItems="center">
        <Typography
          variant="h4"
          sx={[
            { fontWeight: 700, letterSpacing: -0.6 },
            ...(Array.isArray(valueSx) ? valueSx : valueSx ? [valueSx] : []),
          ]}
        >
          {value}
        </Typography>
        {action}
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
}

function AllocationRow({
  label,
  icon,
  balanceUsd,
  apy,
  showManage,
  onManageClick,
}: {
  label: string;
  icon: React.ReactNode;
  balanceUsd?: number | null;
  apy?: number | null;
  showManage?: boolean;
  onManageClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const { t } = useTranslate();

  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ mt: 0.2 }}>{icon}</Box>
        <Stack spacing={0.8}>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {t(label)}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {t('Balance')}:
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {t('APY')}
          </Typography>
        </Stack>
      </Stack>

      <Stack spacing={1} alignItems="flex-end">
        {showManage ? (
          <Button
            onClick={onManageClick}
            variant="text"
            size="small"
            sx={{ textTransform: 'none', fontWeight: 700, color: 'text.primary' }}
            endIcon={<KeyboardArrowDownRoundedIcon />}
          >
            {t('Manage')}
          </Button>
        ) : (
          <Box sx={{ height: 32 }} />
        )}

        <Stack spacing={0.4} alignItems="flex-end">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {balanceUsd != null ? fCurrency(balanceUsd) : ''}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {apy != null ? fRawPercent(apy) : ''}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}
