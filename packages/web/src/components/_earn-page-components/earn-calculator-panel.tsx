'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
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

import { EarnProjectionChart } from './earn-projection-chart';

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
  projectionDateLabel = new Intl.DateTimeFormat('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date()),
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
    const total = safeRows.reduce((sum, row) => sum + row.balanceUsd, 0);

    if (!total) {
      const equal = 100 / Math.max(safeRows.length, 1);
      return Object.fromEntries(safeRows.map((row) => [row.key, equal])) as Record<
        EarnAssetKey,
        number
      >;
    }

    return Object.fromEntries(
      safeRows.map((row) => [row.key, (row.balanceUsd / total) * 100])
    ) as Record<EarnAssetKey, number>;
  }, [safeRows]);

  const createBalancesFromTotal = React.useCallback(
    (totalAmount: number, allocations: Record<EarnAssetKey, number>) =>
      Object.fromEntries(
        safeRows.map((row) => [row.key, totalAmount * ((allocations[row.key] ?? 0) / 100)])
      ) as Record<EarnAssetKey, number>,
    [safeRows]
  );

  const initialBalances = React.useMemo(
    () => createBalancesFromTotal(initialInvestmentAmountUsd, initialAllocations),
    [createBalancesFromTotal, initialInvestmentAmountUsd, initialAllocations]
  );

  const [balances, setBalances] = React.useState<Record<EarnAssetKey, number>>(initialBalances);
  const [investmentInputValue, setInvestmentInputValue] = React.useState(
    initialInvestmentAmountUsd.toFixed(2)
  );
  const [balanceInputValues, setBalanceInputValues] = React.useState<Record<EarnAssetKey, string>>(
    () =>
      Object.fromEntries(
        safeRows.map((row) => [row.key, (initialBalances[row.key] ?? 0).toFixed(2)])
      ) as Record<EarnAssetKey, string>
  );

  React.useEffect(() => {
    setBalances(initialBalances);
    setInvestmentInputValue(initialInvestmentAmountUsd.toFixed(2));
    setBalanceInputValues(
      Object.fromEntries(
        safeRows.map((row) => [row.key, (initialBalances[row.key] ?? 0).toFixed(2)])
      ) as Record<EarnAssetKey, string>
    );
  }, [rowKeysSignature, initialBalances, initialInvestmentAmountUsd, safeRows]);

  const investmentAmountUsd = React.useMemo(
    () => Object.values(balances).reduce((sum, value) => sum + value, 0),
    [balances]
  );

  React.useEffect(() => {
    setInvestmentInputValue(investmentAmountUsd.toFixed(2));
  }, [investmentAmountUsd]);

  React.useEffect(() => {
    setBalanceInputValues((prev) => {
      const next = { ...prev };
      safeRows.forEach((row) => {
        next[row.key] = (balances[row.key] ?? 0).toFixed(2);
      });
      return next;
    });
  }, [balances, safeRows]);

  const allocations = React.useMemo(() => {
    const total = investmentAmountUsd;

    if (!total) {
      return initialAllocations;
    }

    return Object.fromEntries(
      safeRows.map((row) => [row.key, ((balances[row.key] ?? 0) / total) * 100])
    ) as Record<EarnAssetKey, number>;
  }, [balances, investmentAmountUsd, safeRows, initialAllocations]);

  const blendedYield = React.useMemo(
    () =>
      safeRows.reduce((sum, row) => {
        const allocation = (allocations[row.key] ?? 0) / 100;
        return sum + allocation * row.apy;
      }, 0),
    [safeRows, allocations]
  );

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

  const availableLabel =
    balanceLabel ??
    `Total Capital Deployed: ${fCurrency(maxInvestmentAmountUsd ?? initialInvestmentAmountUsd)}`;

  const sanitizeNumberInput = (raw: string) => raw.replace(/,/g, '').replace(/[^\d.]/g, '');

  const scaleBalancesToTotal = React.useCallback(
    (nextTotal: number) => {
      const currentTotal = Object.values(balances).reduce((sum, value) => sum + value, 0);

      if (currentTotal <= 0) {
        setBalances(createBalancesFromTotal(nextTotal, initialAllocations));
        return;
      }

      const ratio = nextTotal / currentTotal;

      setBalances(
        (prev) =>
          Object.fromEntries(
            safeRows.map((row) => [row.key, Math.max((prev[row.key] ?? 0) * ratio, 0)])
          ) as Record<EarnAssetKey, number>
      );
    },
    [balances, createBalancesFromTotal, initialAllocations, safeRows]
  );

  const handleInvestmentChange = (raw: string) => {
    const cleaned = sanitizeNumberInput(raw);
    setInvestmentInputValue(cleaned);

    if (cleaned === '') {
      setBalances(
        Object.fromEntries(safeRows.map((row) => [row.key, 0])) as Record<EarnAssetKey, number>
      );
      return;
    }

    const next = Number(cleaned);
    if (Number.isNaN(next)) return;

    scaleBalancesToTotal(Math.max(next, 0));
  };

  const handleInvestmentBlur = () => {
    setInvestmentInputValue(investmentAmountUsd.toFixed(2));
  };

  const handleMax = () => {
    const next = maxInvestmentAmountUsd ?? initialInvestmentAmountUsd;
    scaleBalancesToTotal(next);
    setInvestmentInputValue(next.toFixed(2));
  };

  const handleAllocationChange = (targetKey: EarnAssetKey, nextValue: number) => {
    const total = investmentAmountUsd;
    const clamped = Math.max(0, Math.min(100, nextValue));
    const otherKeys = safeRows.map((row) => row.key).filter((key) => key !== targetKey);

    if (total <= 0) {
      const nextAllocations = { ...allocations, [targetKey]: clamped };
      const remaining = 100 - clamped;
      const equal = otherKeys.length ? remaining / otherKeys.length : 0;

      otherKeys.forEach((key) => {
        nextAllocations[key] = equal;
      });

      setBalances(createBalancesFromTotal(0, nextAllocations));
      return;
    }

    const currentAllocations = allocations;
    const otherTotalPercent = otherKeys.reduce(
      (sum, key) => sum + (currentAllocations[key] ?? 0),
      0
    );
    const remaining = 100 - clamped;

    const nextAllocations: Record<EarnAssetKey, number> = {
      ...currentAllocations,
      [targetKey]: clamped,
    };

    if (otherKeys.length === 0) {
      setBalances(createBalancesFromTotal(total, nextAllocations));
      return;
    }

    if (otherTotalPercent <= 0) {
      const equal = remaining / otherKeys.length;
      otherKeys.forEach((key) => {
        nextAllocations[key] = equal;
      });
      setBalances(createBalancesFromTotal(total, nextAllocations));
      return;
    }

    otherKeys.forEach((key) => {
      nextAllocations[key] = ((currentAllocations[key] ?? 0) / otherTotalPercent) * remaining;
    });

    setBalances(createBalancesFromTotal(total, nextAllocations));
  };

  const handleBalanceInputChange = (targetKey: EarnAssetKey, raw: string) => {
    const cleaned = sanitizeNumberInput(raw);

    setBalanceInputValues((prev) => ({
      ...prev,
      [targetKey]: cleaned,
    }));

    if (cleaned === '') {
      setBalances((prev) => ({
        ...prev,
        [targetKey]: 0,
      }));
      return;
    }

    const next = Number(cleaned);
    if (Number.isNaN(next)) return;

    setBalances((prev) => ({
      ...prev,
      [targetKey]: Math.max(next, 0),
    }));
  };

  const handleBalanceInputBlur = (targetKey: EarnAssetKey) => {
    setBalanceInputValues((prev) => ({
      ...prev,
      [targetKey]: (balances[targetKey] ?? 0).toFixed(2),
    }));
  };

  const handleAllocate = () => {
    onAllocateClick?.({
      investmentAmountUsd,
      allocations,
      balances,
      blendedYield,
    });
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
                  value={investmentInputValue}
                  onChange={(e) => handleInvestmentChange(e.target.value)}
                  onBlur={handleInvestmentBlur}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
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
                  allocation={allocations[row.key] ?? 0}
                  balanceUsd={balances[row.key] ?? 0}
                  balanceInputValue={balanceInputValues[row.key] ?? '0.00'}
                  onAllocationChange={(value) => handleAllocationChange(row.key, value)}
                  onBalanceInputChange={(value) => handleBalanceInputChange(row.key, value)}
                  onBalanceInputBlur={() => handleBalanceInputBlur(row.key)}
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
                  {buildBlendedFormula(safeRows, allocations)}
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
            <EarnProjectionChart points={chartPoints} baseline={investmentAmountUsd} />

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
  balanceInputValue,
  onAllocationChange,
  onBalanceInputChange,
  onBalanceInputBlur,
}: {
  row: CalculatorRow;
  allocation: number;
  balanceUsd: number;
  balanceInputValue: string;
  onAllocationChange: (value: number) => void;
  onBalanceInputChange: (value: string) => void;
  onBalanceInputBlur: () => void;
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
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={1.5}
          >
            <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {t('Balance:')}
            </Typography>

            <TextField
              value={balanceInputValue}
              onChange={(e) => onBalanceInputChange(e.target.value)}
              onBlur={onBalanceInputBlur}
              size="small"
              sx={{
                width: { xs: '100%', md: 180 },
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 1.5,
                },
                '& .MuiInputBase-input': {
                  fontSize: 18,
                  fontWeight: 700,
                  textAlign: 'right',
                },
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
              }}
            />
          </Stack>

          <Box sx={{ px: 1 }}>
            <Slider
              value={allocation}
              min={0}
              max={100}
              step={1}
              marks={[0, 20, 40, 60, 80, 100].map((value) => ({ value }))}
              onChange={(_, value) => onAllocationChange(Number(value))}
              valueLabelDisplay="on"
              valueLabelFormat={(value) => `${Math.round(value)}%`}
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

function ProjectionMetric({ value, suffix }: { value: number; suffix: string }) {
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

function buildBlendedFormula(rows: CalculatorRow[], allocations: Record<EarnAssetKey, number>) {
  return `Blended APY = ${rows
    .map(
      (row) => `(${((allocations[row.key] ?? 0) / 100).toFixed(2)} × ${(row.apy ?? 0).toFixed(2)})`
    )
    .join(' + ')}`;
}

function DefaultRowIcon({ rowKey }: { rowKey: EarnAssetKey }) {
  const [imgError, setImgError] = React.useState(false);

  const srcByKey: Record<EarnAssetKey, string> = {
    collateral: cdn('tokens/USDC.webp'),
    liquidity: cdn('nav/provide-liquidity.svg'),
    blend: cdn('earn-page/blend.svg'),
  };

  const size = 26;

  if (!imgError && srcByKey[rowKey]) {
    return (
      <Box
        component="img"
        src={srcByKey[rowKey]}
        alt={rowKey}
        onError={() => setImgError(true)}
        sx={{
          width: size,
          height: size,
          display: 'block',
        }}
      />
    );
  }

  if (rowKey === 'liquidity') {
    return <BarChartRoundedIcon sx={{ fontSize: 22, color: 'text.primary' }} />;
  }

  return (
    <InfoOutlinedIcon
      sx={{ fontSize: 22, color: 'text.primary', opacity: rowKey === 'blend' ? 1 : 0.75 }}
    />
  );
}
