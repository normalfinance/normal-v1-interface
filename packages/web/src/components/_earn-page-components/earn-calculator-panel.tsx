'use client';

import * as React from 'react';

import { useTranslate } from '@/locales';
import { fCurrency, fRawPercent } from '@/utils/format-number';

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import {
  Box,
  Stack,
  Button,
  Slider,
  Divider,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';

import type { EarnAssetKey, EarnAllocationRow } from './earn-overview';

type CalculatorRow = EarnAllocationRow;

export type EarnCalculatorPanelProps = {
  rows: CalculatorRow[];
  initialInvestmentAmountUsd: number;
  maxInvestmentAmountUsd?: number;
  balanceLabel?: string;
  projectionDateLabel?: string;
  allocateCtaLabel?: string;
  onAllocateClick?: (payload: {
    investmentAmountUsd: number;
    allocations: Record<EarnAssetKey, number>;
    balances: Record<EarnAssetKey, number>;
    blendedYield: number;
  }) => void;
  onClose?: () => void;
};

const YEARS = [1, 5, 10] as const;

export function EarnCalculatorPanel({
  rows,
  initialInvestmentAmountUsd,
  maxInvestmentAmountUsd,
  balanceLabel,
  projectionDateLabel = '19. 02. 2027',
  allocateCtaLabel = 'Allocate Capital',
  onAllocateClick,
  onClose,
}: EarnCalculatorPanelProps) {
  const { t } = useTranslate();

  const safeRows = React.useMemo(
    () => rows.map((row) => ({ ...row, balanceUsd: row.balanceUsd ?? 0, apy: row.apy ?? 0 })),
    [rows]
  );

  const rowKeysSignature = React.useMemo(
    () => safeRows.map((row) => row.key).join('|'),
    [safeRows]
  );

  const initialAllocations = React.useMemo(() => {
    const total = safeRows.reduce((sum, row) => sum + (row.balanceUsd ?? 0), 0);

    if (!total) {
      const equal = 100 / Math.max(safeRows.length, 1);
      return Object.fromEntries(
        safeRows.map((row) => [row.key, equal])
      ) as Record<EarnAssetKey, number>;
    }

    return Object.fromEntries(
      safeRows.map((row) => [row.key, ((row.balanceUsd ?? 0) / total) * 100])
    ) as Record<EarnAssetKey, number>;
  }, [safeRows]);

  const [investmentAmountUsd, setInvestmentAmountUsd] = React.useState(initialInvestmentAmountUsd);
  const [inputValue, setInputValue] = React.useState(initialInvestmentAmountUsd.toFixed(2));
  const [allocations, setAllocations] =
    React.useState<Record<EarnAssetKey, number>>(initialAllocations);

  React.useEffect(() => {
    setInvestmentAmountUsd(initialInvestmentAmountUsd);
    setInputValue(initialInvestmentAmountUsd.toFixed(2));
  }, [initialInvestmentAmountUsd]);

  React.useEffect(() => {
    setAllocations(initialAllocations);
  }, [rowKeysSignature, initialAllocations]);

  const availableLabel =
    balanceLabel ??
    `Balance: ${(maxInvestmentAmountUsd ?? initialInvestmentAmountUsd).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USDC`;

  const normalizedAllocations = React.useMemo(() => {
    const total = Object.values(allocations).reduce((sum, value) => sum + value, 0);

    if (!total) {
      const equal = 100 / Math.max(safeRows.length, 1);
      return Object.fromEntries(
        safeRows.map((row) => [row.key, equal])
      ) as Record<EarnAssetKey, number>;
    }

    return Object.fromEntries(
      Object.entries(allocations).map(([key, value]) => [key, (value / total) * 100])
    ) as Record<EarnAssetKey, number>;
  }, [allocations, safeRows]);

  const balancesByKey = React.useMemo(() => {
    return Object.fromEntries(
      safeRows.map((row) => [
        row.key,
        investmentAmountUsd * ((normalizedAllocations[row.key] ?? 0) / 100),
      ])
    ) as Record<EarnAssetKey, number>;
  }, [safeRows, investmentAmountUsd, normalizedAllocations]);

  const blendedYield = React.useMemo(() => {
    return safeRows.reduce((sum, row) => {
      const allocation = (normalizedAllocations[row.key] ?? 0) / 100;
      return sum + allocation * (row.apy ?? 0);
    }, 0);
  }, [safeRows, normalizedAllocations]);

  const dailyUsd = (investmentAmountUsd * blendedYield) / 365;
  const monthlyUsd = (investmentAmountUsd * blendedYield) / 12;
  const yearlyUsd = investmentAmountUsd * blendedYield;

  const futureBalance = React.useCallback(
    (years: number) => investmentAmountUsd * Math.pow(1 + blendedYield, years),
    [investmentAmountUsd, blendedYield]
  );

  const futureGain = React.useCallback(
    (years: number) => futureBalance(years) - investmentAmountUsd,
    [futureBalance, investmentAmountUsd]
  );

  const yearlySnapshots = React.useMemo(
    () =>
      YEARS.map((year) => ({
        label: `${year} ${year === 1 ? 'Year' : 'Years'}`,
        balanceUsd: futureBalance(year),
        gainUsd: futureGain(year),
      })),
    [futureBalance, futureGain]
  );

  const chartPoints = React.useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const year = index + 1;
        return {
          label: `${year}Y`,
          value: futureBalance(year),
        };
      }),
    [futureBalance]
  );

  const balanceOnDateUsd = futureBalance(1);

  const handleInvestmentChange = (raw: string) => {
    const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '');

    setInputValue(cleaned);

    if (cleaned === '') {
      setInvestmentAmountUsd(0);
      return;
    }

    const next = Number(cleaned);

    if (Number.isNaN(next)) return;

    setInvestmentAmountUsd(Math.max(next, 0));
  };

  const handleInvestmentBlur = () => {
    setInputValue(investmentAmountUsd.toFixed(2));
  };

  const handleMax = () => {
    const next = maxInvestmentAmountUsd ?? initialInvestmentAmountUsd;
    setInvestmentAmountUsd(next);
    setInputValue(next.toFixed(2));
  };

  const handleAllocationChange = (targetKey: EarnAssetKey, nextValue: number) => {
    const clamped = Math.max(0, Math.min(100, nextValue));
    const current = normalizedAllocations;
    const otherKeys = safeRows.map((row) => row.key).filter((key) => key !== targetKey);
    const remaining = 100 - clamped;

    const nextAllocations: Record<EarnAssetKey, number> = {
      ...current,
      [targetKey]: clamped,
    };

    if (otherKeys.length === 0) {
      setAllocations(nextAllocations);
      return;
    }

    const otherTotal = otherKeys.reduce((sum, key) => sum + (current[key] ?? 0), 0);

    if (otherTotal <= 0) {
      const equal = remaining / otherKeys.length;
      otherKeys.forEach((key) => {
        nextAllocations[key] = equal;
      });
      setAllocations(nextAllocations);
      return;
    }

    otherKeys.forEach((key) => {
      nextAllocations[key] = ((current[key] ?? 0) / otherTotal) * remaining;
    });

    setAllocations(nextAllocations);
  };

  const handleAllocate = () => {
    
  };

  return (
    <Box
      sx={{
        bgcolor: 'grey.100',
        borderRadius: 2,
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Panel shell */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="stretch" sx={{ width: '100%' }}>
        {/* Left side */}
        <Box sx={{ flex: 1, pr: { md: 4 } }}>
          <Stack spacing={4}>
            {/* Header */}
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {t('Estimate your earnings')}
              </Typography>

              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  color: 'text.primary',
                }}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>

            {/* Investment amount */}
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Typography variant="h6" sx={{ fontWeight: 500, minWidth: { md: 180 } }}>
                  {t('Investment Amount:')}
                </Typography>

                <TextField
                  fullWidth
                  value={inputValue}
                  onChange={(e) => handleInvestmentChange(e.target.value)}
                  onBlur={handleInvestmentBlur}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleMax}
                            sx={{
                              minWidth: 'auto',
                              px: 1.5,
                              borderRadius: 999,
                              color: 'text.primary',
                              borderColor: 'divider',
                              bgcolor: 'rgba(255,255,255,0.3)',
                            }}
                          >
                            {t('Max')}
                          </Button>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 1.5,
                    },
                    '& .MuiInputBase-input': {
                      fontSize: 20,
                      fontWeight: 500,
                    },
                  }}
                />
              </Stack>

              <Typography variant="body2" sx={{ color: 'text.secondary', ml: { md: 25 } }}>
                {t(availableLabel)}
              </Typography>
            </Stack>

            {/* Allocation rows */}
            <Stack divider={<Divider flexItem />}>
              {safeRows.map((row) => (
                <CalculatorAllocationRow
                  key={row.key}
                  row={row}
                  allocation={normalizedAllocations[row.key] ?? 0}
                  balanceUsd={balancesByKey[row.key] ?? 0}
                  onChange={(value) => handleAllocationChange(row.key, value)}
                />
              ))}
            </Stack>

            {/* Blended yield */}
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={2}
            >
              <Stack spacing={1.5}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {t('Blended Yield')}
                </Typography>

                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {buildBlendedFormula(safeRows, normalizedAllocations)}
                </Typography>
              </Stack>

              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {fRawPercent(blendedYield)}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Middle divider */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: '1px',
            bgcolor: 'divider',
            opacity: 0.8,
          }}
        />

        {/* Right side */}
        <Box sx={{ width: { xs: '100%', md: 420 }, pl: { md: 4 }, pt: { xs: 4, md: 0 } }}>
          <Stack spacing={3}>
            {/* Close */}
            <Stack
              direction="row"
              justifyContent="flex-end"
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              <IconButton onClick={onClose} sx={{ color: 'text.primary' }}>
                <CloseRoundedIcon />
              </IconButton>
            </Stack>

            {/* Projection headline */}
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              {t('Earnings Projection')}
            </Typography>

            {/* Projection numbers */}
            <Stack divider={<Divider flexItem />}>
              <ProjectionMetric value={dailyUsd} suffix={t('per day')} />
              <ProjectionMetric value={monthlyUsd} suffix={t('per month')} />
              <ProjectionMetric value={yearlyUsd} suffix={t('per year')} />
            </Stack>

            {/* Balance on date */}
            <Stack spacing={1}>
              <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {t('Balance on')} {projectionDateLabel}:
              </Typography>

              <Typography variant="h2" sx={{ fontWeight: 700, letterSpacing: -1 }}>
                {fCurrency(balanceOnDateUsd)}
              </Typography>
            </Stack>

            {/* Snapshot cards */}
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Stack direction="row" divider={<Divider orientation="vertical" flexItem />}>
                {yearlySnapshots.map((item) => (
                  <Stack key={item.label} spacing={1} sx={{ flex: 1, p: 2 }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {t(item.label)}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {fCurrency(item.balanceUsd)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      +{fCurrency(item.gainUsd)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Chart */}
            <ProjectionChart points={chartPoints} baseline={investmentAmountUsd} />

            {/* CTA */}
            <Button
              onClick={handleAllocate}
              variant="darkSoft"
              fullWidth
              sx={{ py: 1.6, borderRadius: 999, fontWeight: 700 }}
            >
              {t(allocateCtaLabel)}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function CalculatorAllocationRow({
  row,
  allocation,
  balanceUsd,
  onChange,
}: {
  row: CalculatorRow;
  allocation: number;
  balanceUsd: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslate();

  return (
    <Box sx={{ py: 3 }}>
      {/* Asset header */}
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {row.icon ?? <DefaultRowIcon rowKey={row.key} />}
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t(row.label)}
          </Typography>
        </Stack>

        {/* Slider block */}
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {t('Balance:')}
            </Typography>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {fCurrency(balanceUsd)}
            </Typography>
          </Stack>

          <Box sx={{ px: 1 }}>
            <Slider
              value={allocation}
              min={0}
              max={100}
              step={1}
              marks={[0, 20, 40, 60, 80, 100].map((value) => ({ value }))}
              onChange={(_, value) => onChange(Number(value))}
              valueLabelDisplay="on"
              valueLabelFormat={(value) => `${Math.round(value)}`}
              sx={{
                color: 'text.primary',
                height: 6,
                '& .MuiSlider-track': {
                  border: 'none',
                },
                '& .MuiSlider-rail': {
                  opacity: 1,
                  bgcolor: 'divider',
                },
                '& .MuiSlider-thumb': {
                  width: 18,
                  height: 18,
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'divider',
                },
                '& .MuiSlider-mark': {
                  width: 2,
                  height: 8,
                  borderRadius: 999,
                  bgcolor: 'divider',
                },
                '& .MuiSlider-valueLabel': {
                  bgcolor: 'text.primary',
                  borderRadius: 1,
                  fontWeight: 700,
                },
              }}
            />
          </Box>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {t('Allocation')}
            </Typography>

            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {Math.round(allocation)}%
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

function ProjectionMetric({
  value,
  suffix,
}: {
  value: number;
  suffix: string;
}) {
  return (
    <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ py: 2 }}>
      <Typography variant="h2" sx={{ fontWeight: 700, letterSpacing: -1 }}>
        {fCurrency(value)}
      </Typography>
      <Typography variant="h4" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {suffix}
      </Typography>
    </Stack>
  );
}

function ProjectionChart({
  points,
  baseline,
}: {
  points: Array<{ label: string; value: number }>;
  baseline: number;
}) {
  const maxValue = Math.max(...points.map((p) => p.value), baseline || 0);
  const minValue = Math.min(...points.map((p) => p.value), baseline || 0);
  const range = Math.max(maxValue - minValue, 1);

  const chartWidth = 320;
  const chartHeight = 170;
  const leftPad = 58;
  const rightPad = 8;
  const topPad = 10;
  const bottomPad = 28;
  const innerWidth = chartWidth - leftPad - rightPad;
  const innerHeight = chartHeight - topPad - bottomPad;

  const coords = points.map((point, idx) => {
    const x = leftPad + (idx * innerWidth) / Math.max(points.length - 1, 1);
    const y = topPad + (1 - (point.value - minValue) / range) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = coords
    .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? leftPad} ${
    topPad + innerHeight
  } L ${coords[0]?.x ?? leftPad} ${topPad + innerHeight} Z`;

  return (
    <Stack spacing={1.5}>
      {/* Y labels */}
      <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {fCurrency(maxValue)}
        </Typography>
        <Box />
      </Stack>

      {/* Chart canvas */}
      <Box sx={{ position: 'relative', width: '100%', height: chartHeight }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <path d={areaPath} fill="rgba(32, 227, 162, 0.10)" />
          <path d={linePath} fill="none" stroke="#20E3A2" strokeWidth="2.5" />
        </svg>

        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            left: 0,
            bottom: bottomPad - 4,
            color: 'text.secondary',
          }}
        >
          {fCurrency(baseline)}
        </Typography>
      </Box>

      {/* X labels */}
      <Stack direction="row" justifyContent="space-between" sx={{ pl: 7 }}>
        {points.map((point) => (
          <Typography key={point.label} variant="body2" sx={{ color: 'text.secondary' }}>
            {point.label}
          </Typography>
        ))}
      </Stack>
    </Stack>
  );
}

function buildBlendedFormula(
  rows: CalculatorRow[],
  allocations: Record<EarnAssetKey, number>
) {
  return `Blended APY = ${rows
    .map((row) => `(${((allocations[row.key] ?? 0) / 100).toFixed(2)} × ${(row.apy ?? 0).toFixed(2)})`)
    .join(' + ')}`;
}

function DefaultRowIcon({ rowKey }: { rowKey: EarnAssetKey }) {
  if (rowKey === 'liquidity') {
    return <BarChartRoundedIcon sx={{ fontSize: 22, color: 'text.primary' }} />;
  }

  return (
    <InfoOutlinedIcon
      sx={{ fontSize: 22, color: 'text.primary', opacity: rowKey === 'blend' ? 1 : 0.75 }}
    />
  );
}