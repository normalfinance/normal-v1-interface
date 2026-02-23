'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { fCurrency, fRawPercent } from '@/utils/format-number';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  Box,
  Card,
  Stack,
  Button,
  Avatar,
  useTheme,
  Accordion,
  Typography,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material';

export type UsdcLiquidityPool = {
  id: string;
  pairLabel: string;
  tokenA: { symbol: string };
  tokenB: { symbol: string };
  apy: number;
  totalBalanceUsd: number;
  tokenABalanceUsd?: number;
  tokenBBalanceAmount?: number;
  tokenBBalanceSymbol?: string;
  feesBalanceUsd?: number;
};

export type ProvideUsdcLiquidityCardProps = {
  totalLpBalanceUsd: number;
  avgApy: number;
  activePools: number;
  pools: UsdcLiquidityPool[];
  defaultExpandedPoolId?: string;
  onHelpClick?: () => void;
  onClaimFees?: (poolId: string) => void;
  onDeposit?: (poolId: string) => void;
  onWithdraw?: (poolId: string) => void;
  addLiquidityLabel?: string;
  onAddLiquidity?: () => void;
  sx?: SxProps<Theme>;
};

export function ProvideUsdcLiquidityCard(props: ProvideUsdcLiquidityCardProps) {
  const theme = useTheme();
  const { t } = useTranslate();

  const {
    totalLpBalanceUsd,
    avgApy,
    activePools,
    pools,
    defaultExpandedPoolId,
    onHelpClick,
    onClaimFees,
    onDeposit,
    onWithdraw,
    addLiquidityLabel = t('Add Liquidity'),
    onAddLiquidity,
    sx,
  } = props;

  const [expanded, setExpanded] = React.useState<string | false>(
    defaultExpandedPoolId ?? pools[0]?.id ?? false
  );

  const handleChange = (poolId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? poolId : false);
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, md: 3 },
        ...((sx as any) ?? {}),
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('Provide Liquidity')}
        </Typography>

        <Button
          onClick={onHelpClick}
          variant="text"
          size="small"
          startIcon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}
          sx={{
            mt: 0.25,
            textTransform: 'none',
            fontWeight: 700,
            color: 'text.secondary',
            minWidth: 'auto',
            px: 1,
          }}
        >
          {t('Help')}
        </Button>
      </Stack>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3, mb: 3 }} spacing={2}>
        <Stack spacing={2}>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t('Total LP Balance')}:
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t('Avg APY')}:
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t('Active Pools')}:
          </Typography>
        </Stack>

        <Stack spacing={2} alignItems="flex-end">
          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {fCurrency(totalLpBalanceUsd)}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {fRawPercent(avgApy)}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {activePools}
          </Typography>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {pools.map((pool) => {
          const isExpanded = expanded === pool.id;
          const paperSx = {
            bgcolor: '#F9FAFB',
            borderRadius: 1,
          };
          return (
            <Accordion
              key={pool.id}
              expanded={isExpanded}
              onChange={handleChange(pool.id)}
              disableGutters
              elevation={0}
              square={false}
              sx={{
                ...paperSx,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                '&:before': { display: 'none' },

                '&.Mui-expanded': {
                  margin: 0,
                  ...paperSx,
                },

                '& .MuiAccordionSummary-root': {
                  ...paperSx,
                  minHeight: 64,
                },
                '& .MuiAccordionSummary-root.Mui-expanded': {
                  minHeight: 64,
                  ...paperSx,
                },

                '& .MuiAccordionSummary-content': {
                  margin: 0,
                },
                '& .MuiAccordionSummary-content.Mui-expanded': {
                  margin: 0,
                },

                '& .MuiAccordionDetails-root': {
                  ...paperSx,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon />}
                sx={{
                  px: 2,
                  py: 1.5,
                  '&.Mui-expanded': {
                    py: 1.5,
                  },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ width: '100%' }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <TokenPairIcon a={pool.tokenA.symbol} b={pool.tokenB.symbol} />

                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {pool.pairLabel}
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {fCurrency(pool.totalBalanceUsd)}
                    </Typography>
                  </Stack>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 2, pb: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Stack spacing={1.6}>
                      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {t('APY')}
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {t('Total Balance')}:
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {t(`${pool.tokenA.symbol} Balance`)}:
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {t(`${pool.tokenB.symbol} Balance`)}:
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {t('Fees Balance')}:
                      </Typography>
                    </Stack>

                    <Stack spacing={1.6} alignItems="flex-end">
                      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {fRawPercent(pool.apy)}
                      </Typography>

                      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {fCurrency(pool.totalBalanceUsd)}
                      </Typography>

                      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {pool.tokenABalanceUsd != null ? fCurrency(pool.tokenABalanceUsd) : '—'}
                      </Typography>

                      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {pool.tokenBBalanceAmount != null
                          ? `${pool.tokenBBalanceAmount.toFixed(2)} ${
                              pool.tokenBBalanceSymbol ?? pool.tokenB.symbol
                            }`
                          : '—'}
                      </Typography>

                      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {pool.feesBalanceUsd != null ? fCurrency(pool.feesBalanceUsd) : '—'}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                    <Button variant="gradientSoft" onClick={() => onClaimFees?.(pool.id)}>
                      {t('Claim Fees Balance')}
                    </Button>

                    <Button onClick={() => onDeposit?.(pool.id)} variant="darkSoft">
                      {t('Deposit')}
                    </Button>

                    <Button
                      onClick={() => onWithdraw?.(pool.id)}
                      variant="soft"
                      color="inherit"
                      sx={{
                        borderRadius: 999,
                      }}
                    >
                      {t('Withdraw')}
                    </Button>
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>

      <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary', fontWeight: 700 }}>
        {t('Earn Normal Tokens for providing asset liquidity.')}
      </Typography>

      <Button
        onClick={onAddLiquidity}
        variant="darkSoft"
        fullWidth
        sx={{
          mt: 2,
          py: 1.6,
          borderRadius: 999,
          fontWeight: 700,
        }}
      >
        {t(addLiquidityLabel)}
      </Button>
    </Card>
  );
}

function TokenPairIcon({ a, b }: { a: string; b: string }) {
  const [errA, setErrA] = React.useState(false);
  const [errB, setErrB] = React.useState(false);

  const srcA = cdn(`tokens/${a.toLowerCase()}.webp`);
  const srcB = cdn(`tokens/${b.toLowerCase()}.webp`);

  const letterFor = (sym: string) => sym.toUpperCase().slice(0, 1);

  return (
    <Box sx={{ position: 'relative', width: 44, height: 28 }}>
      <Avatar
        src={!errA ? srcA : undefined}
        sx={{
          width: 26,
          height: 26,
          fontSize: 12,
          fontWeight: 700,
          position: 'absolute',
          left: 0,
          top: 1,
          border: '2px solid',
          borderColor: 'background.paper',
        }}
        imgProps={{ onError: () => setErrA(true) }}
      >
        {letterFor(a)}
      </Avatar>

      <Avatar
        src={!errB ? srcB : undefined}
        sx={{
          width: 26,
          height: 26,
          fontSize: 12,
          fontWeight: 700,
          position: 'absolute',
          left: 16,
          top: 1,
          border: '2px solid',
          borderColor: 'background.paper',
        }}
        imgProps={{ onError: () => setErrB(true) }}
      >
        {letterFor(b)}
      </Avatar>
    </Box>
  );
}
function GradientOutlineButton({
  children,
  onClick,
  sx,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}) {
  const theme = useTheme();

  return (
    <Button
      onClick={onClick}
      variant="outlined"
      sx={[
        {
          position: 'relative',
          borderRadius: 999,
          fontWeight: 700,
          textTransform: 'none',
          color: 'text.primary',
          border: '1px solid transparent',
          backgroundImage: 'linear-gradient(#fff,#fff), linear-gradient(90deg, #20E3A2, #2775CA)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          ...(theme.palette.mode === 'dark'
            ? {
                backgroundImage:
                  'linear-gradient(#111827,#111827), linear-gradient(90deg, #20E3A2, #2775CA)',
              }
            : null),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Button>
  );
}
