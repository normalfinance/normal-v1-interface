'use client';

import type { IndexDetails } from '@normalfinance/types';
import type { ApexOptions } from 'apexcharts';
import { useTranslate } from '@/locales';
import { fPercent, fCurrency } from '@/utils/format-number';
import { groupAccentByIndex, groupAccentDarkByIndex } from '@/theme/accents';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Card, Stack, Avatar, Typography, Button } from '@mui/material';
import { Iconify } from '../template/iconify';
import NextLink from 'next/link';
import { Chart } from '@/components/template/chart';
import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

const RIGHT_MIN_PX = 240;

export interface IndexCardProps {
  index: IndexDetails;
  highlightType?: 'staff-pick' | 'trending' | 'gainer';
  onClick?: () => void;
  chartSeries?: number[];
}

export function IndexCard({ index, highlightType, onClick, chartSeries }: IndexCardProps) {
  const theme = useTheme();
  const { t } = useTranslate();

  const highlightMap: Record<NonNullable<IndexCardProps['highlightType']>, { label: string }> = {
    'staff-pick': { label: t('Staff Pick') },
    trending: { label: t('Trending') },
    gainer: { label: t('Top Gainer') },
  };

  const highlight = highlightType ? highlightMap[highlightType] : undefined;

  const isUp = index.priceChangePct24h >= 0;

  const paletteIndex = highlightType === 'staff-pick' ? 1 : highlightType === 'trending' ? 2 : 3;

  const accentLight = groupAccentByIndex(paletteIndex);
  const accentMain = groupAccentDarkByIndex(paletteIndex);

  // compress to 8 evenly-spaced points (like the widget example)
  const widgetSeries = useMemo(() => {
    if (!chartSeries || chartSeries.length === 0) return [];
    const target = 8;
    if (chartSeries.length <= target) return chartSeries;
    const step = (chartSeries.length - 1) / (target - 1);
    const out: number[] = [];
    for (let i = 0; i < target; i += 1) out.push(chartSeries[Math.round(i * step)]);
    return out;
  }, [chartSeries]);

  // optional categories (not shown, sparkline hides labels anyway)
  const categories = useMemo(() => widgetSeries.map((_, i) => `${i + 1}`), [widgetSeries]);

  // options styled like EcommerceWidgetSummary
  const chartOptions: ApexOptions = {
    chart: {
      sparkline: { enabled: true },
      toolbar: { show: false },
      animations: { enabled: true },
    },
    colors: [accentMain],
    xaxis: {
      categories,
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
    },
    grid: { padding: { top: 6, left: 6, right: 6, bottom: 6 } },
    stroke: {
      curve: 'smooth',
      lineCap: 'butt',
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: accentLight, opacity: 1 }, // start
          { offset: 100, color: accentMain, opacity: 1 }, // end
        ],
      },
    },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    tooltip: { enabled: false },
    yaxis: { show: false },
    markers: { size: 0 },
  };

  const targetHref = index.url ?? `/index/${index.slug}`;

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 3,
        borderRadius: 3,
        border: 1,
        borderColor: alpha(theme.palette.grey[500], 0.24),
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
        minHeight: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: '48px',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        columnGap={2}
        rowGap={2}
        alignItems="flex-start"
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{
            flex: '1 1 240px',
            minWidth: { xs: 240, sm: 240 },
            maxWidth: '100%',
          }}
        >
          <Box
            sx={{
              p: 0.5,
              borderRadius: '9999px',
              bgcolor: 'grey.200',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Avatar src={index.avatar} sx={{ width: 60, height: 60 }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            {highlight && (
              <Box
                mb={1}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: alpha(
                    highlightType === 'staff-pick'
                      ? groupAccentByIndex(1)
                      : highlightType === 'trending'
                        ? groupAccentByIndex(2)
                        : groupAccentByIndex(3),
                    0.1
                  ),
                  width: 'fit-content',
                  whiteSpace: 'nowrap',
                  alignSelf: 'start',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={500}
                  sx={{
                    lineHeight: 1.3,
                    color:
                      highlightType === 'staff-pick'
                        ? groupAccentDarkByIndex(1)
                        : highlightType === 'trending'
                          ? groupAccentDarkByIndex(2)
                          : groupAccentDarkByIndex(3),
                  }}
                >
                  {highlight.label}
                </Typography>
              </Box>
            )}

            <Typography variant="subtitle1" fontWeight={500} mb={0.5} sx={{ whiteSpace: 'normal' }}>
              {index.name}
            </Typography>

            <Typography variant="caption" fontSize={12} sx={{ whiteSpace: 'normal' }}>
              <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {t('{{count}} Coins', { count: index.coinCount })}
              </Box>
              {' · '}
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {t(`strategy.${index.weighting.label}`, { defaultValue: index.weighting.label })}
              </Box>
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ flex: '0 0 auto', ml: 'auto' }}>
          <Box
            sx={{
              gap: 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              px: '10px',
              py: '5px',
              backgroundColor: 'grey.100',
              border: 1,
              borderColor: 'divider',
              borderRadius: 9999,
            }}
          >
            <Iconify
              width={12}
              icon={
                index.priceChangePct24h < 0
                  ? 'solar:double-alt-arrow-down-bold-duotone'
                  : 'solar:double-alt-arrow-up-bold-duotone'
              }
              sx={{ color: index.priceChangePct24h >= 0 ? 'success.main' : 'error.main' }}
            />
            <Box component="span" sx={{ typography: 'subtitle2', fontWeight: 700 }} fontSize={12}>
              {index.priceChangePct24h > 0 && '+'}
              {fPercent(index.priceChangePct24h)}
            </Box>
            <Box
              component="span"
              sx={{ color: 'text.secondary', typography: 'body2' }}
              fontSize={12}
            >
              {t('24h')}
            </Box>
          </Box>
        </Box>
      </Stack>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        columnGap={3}
        rowGap={2}
        alignItems="flex-start"
      >
        {/* Left: chart fills leftover; when right wraps, this becomes full-width automatically */}
        <Box
          sx={(theme) => ({
            flexGrow: 1,
            flexShrink: 1,
            // reserve RIGHT_MIN + gap for the right column
            flexBasis: `calc(100% - ${RIGHT_MIN_PX}px - ${theme.spacing(3)})`,
            minWidth: 140,
          })}
        >
          {widgetSeries.length > 1 && (
            <Chart
              type="line"
              series={[{ data: widgetSeries }]}
              options={chartOptions}
              sx={{
                width: '100%',
                aspectRatio: '3 / 2',
                minHeight: 66,
              }}
            />
          )}
        </Box>

        {/* Right: fixed minimum footprint; wraps below when container < RIGHT_MIN + gap + chart min */}
        <Stack
          sx={{
            flex: `0 0 ${RIGHT_MIN_PX}px`,
            minWidth: RIGHT_MIN_PX,
          }}
        >
          <Stack direction="row" gap={3} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="caption" color="text.secondary" fontSize={12}>
                {t('Price')}
              </Typography>
              <Typography variant="body2" fontWeight={600} fontSize={20}>
                {fCurrency(index.priceUsd)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontSize={12}>
                {t('TVL')}
              </Typography>
              <Typography variant="body2" fontWeight={600} fontSize={20}>
                {fCurrency(index.tvlUsd)}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mt: 1, width: '100%' }}>
            {index.constituents.map((t, i) => (
              <Box
                key={`${t.shortname}-${i}`}
                sx={{
                  gap: 0.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: '8px',
                  py: '4px',
                  backgroundColor: 'grey.100',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '6px',
                  typography: 'caption',
                }}
              >
                {t.shortname}
              </Box>
            ))}
          </Stack>
        </Stack>
      </Stack>
      <Button
        component={NextLink}
        href={targetHref}
        variant="contained"
        disableElevation
        sx={(theme) => ({
          bgcolor: 'text.primary',
          color: 'common.white',
          whiteSpace: 'nowrap',
          '&:hover': {
            bgcolor: theme.vars
              ? `rgba(${theme.vars.palette.text.primaryChannel} / 0.92)`
              : alpha(theme.palette.text.primary, 0.92),
          },
          '&:active': {
            bgcolor: theme.vars
              ? `rgba(${theme.vars.palette.text.primaryChannel} / 0.86)`
              : alpha(theme.palette.text.primary, 0.86),
          },
        })}
      >
        {t('Invest')}
      </Button>
    </Card>
  );
}
