import type { Token } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import React, { useState, useCallback } from 'react';

import TabPanel from '@mui/lab/TabPanel';
import TabContext from '@mui/lab/TabContext';
import { Box, Grid2, Button, Divider, Typography, Button as MuiButton } from '@mui/material';

import { TokenBox } from './TokenBox';

export interface LiquidityMiningProps {
  // Rewards
  rewards: Token[];
  onClaimRewards: () => void;
  tokenName: string;
  // Stake LP Tokens
  balance: number;
  onStake: (amount: number) => void;
}

export interface LabTabProps {
  tokenB: Token;
  liquidityToken: Token;
  onAddLiquidity: (tokenAmount: number) => void;
  onRemoveLiquidity: (liquidityTokenAmount: number, fix?: boolean) => void;
}

export interface PoolLiquidityProps {
  tokenA: Token;
  tokenB: Token;
  liquidityToken: Token;
  liquidityA: number;
  liquidityB: number;
  onAddLiquidity: (tokenAmount: number) => void;
  onRemoveLiquidity: (liquidityTokenAmount: number, fix?: boolean) => void;
}

/**
 * LabTabs Component
 */
const LabTabs = ({ tokenB, liquidityToken, onAddLiquidity, onRemoveLiquidity }: LabTabProps) => {
  const [value, setValue] = useState('1');
  const [tokenBValue, setTokenBValue] = useState<string | undefined>(undefined);
  const [tokenCValue, setTokenCValue] = useState<string | undefined>(undefined);

  const { t } = useTranslate('auto');

  const keepRatioB = useCallback((val: string) => {
    setTokenBValue(val);
  }, []);

  const buttonStyles = {
    flex: 1,
    maxWidth: '200px',
    color: '#FFF',
    fontSize: '0.875rem',
    fontWeight: 700,
    textTransform: 'none',
    borderRadius: '12px',
    transition: 'all 0.3s',
    backgroundImage:
      'linear-gradient(95.06deg, rgb(226, 73, 26) 0%, rgb(226, 27, 27) 16.92%, rgb(226, 73, 26) 42.31%, rgb(226, 170, 27) 99.08%)',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  };

  return (
    <Box sx={{ width: '100%', typography: 'body1', mt: 2 }}>
      <TabContext value={value}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <MuiButton
            onClick={() => setValue('1')}
            sx={{
              ...buttonStyles,
              backgroundImage:
                value === '1'
                  ? 'linear-gradient(95.06deg, rgb(226, 73, 26) 0%, rgb(226, 27, 27) 16.92%, rgb(226, 73, 26) 42.31%, rgb(226, 170, 27) 99.08%)'
                  : 'none',
              filter: value === '1' ? 'brightness(1.2)' : 'brightness(1)',
            }}
          >
            {t('Add Liquidity')}
          </MuiButton>
          <MuiButton
            onClick={() => setValue('2')}
            sx={{
              ...buttonStyles,
              backgroundImage:
                value === '2'
                  ? 'linear-gradient(95.06deg, rgb(226, 73, 26) 0%, rgb(226, 27, 27) 16.92%, rgb(226, 73, 26) 42.31%, rgb(226, 170, 27) 99.08%)'
                  : 'none',
              filter: value === '2' ? 'brightness(1.2)' : 'brightness(1)',
            }}
          >
            {t('Remove Liquidity')}
          </MuiButton>
        </Box>
        <TabPanel value="1" sx={{ p: 0, mt: 3 }}>
          <Box mt={2}>
            <TokenBox
              value={tokenBValue}
              onChange={(val) => keepRatioB(val)}
              token={tokenB}
              hideDropdownButton
            />
          </Box>
          <Button onClick={() => onAddLiquidity(Number(tokenBValue))} fullWidth sx={{ mt: 3 }}>
            {t('Add Liquidity')}
          </Button>
        </TabPanel>
        <TabPanel value="2" sx={{ p: 0, mt: 3 }}>
          <Box>
            <TokenBox
              value={tokenCValue}
              onChange={(val) => setTokenCValue(val)}
              token={liquidityToken}
              hideDropdownButton
            />
          </Box>
          <Button onClick={() => onRemoveLiquidity(Number(tokenCValue))} fullWidth sx={{ mt: 3 }}>
            {t('Remove Liquidity')}
          </Button>
        </TabPanel>
      </TabContext>
    </Box>
  );
};

/**
 * PoolLiquidity Component
 */
const PoolLiquidityTemp = ({
  tokenA,
  tokenB,
  liquidityA,
  liquidityB,
  liquidityToken,
  onAddLiquidity,
  onRemoveLiquidity,
}: PoolLiquidityProps) => {
  const { t } = useTranslate('auto');

  return (
    <Box
      sx={{
        borderRadius: '16px',
        // background:
        //   'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%)',
        p: 3,
      }}
    >
      <Box display="flex" justifyContent="center" gap={2} mb={3}>
        <img src={tokenA.icon} alt={tokenA.name} width={48} height={48} />
        <img src={tokenB.icon} alt={tokenB.name} width={48} height={48} />
      </Box>
      {/* eslint-disable i18next/no-literal-string */}
      <Typography sx={{ textAlign: 'center', fontWeight: 700, mb: 2 }}>Pool Liquidity</Typography>
      {/* eslint-enable i18next/no-literal-string */}
      <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      <Grid2 container spacing={2} mt={2}>
        <Grid2 size={{ xs: 4 }}>
          <Typography sx={{ fontSize: '0.875rem', opacity: 0.7 }}>{tokenA.name}</Typography>
          <Typography sx={{ fontWeight: 700 }}>{liquidityA}</Typography>
        </Grid2>
        <Grid2 size={{ xs: 4 }}>
          <Typography sx={{ fontSize: '0.875rem', opacity: 0.7 }}>{tokenB.name}</Typography>
          <Typography sx={{ fontWeight: 700 }}>{liquidityB}</Typography>
        </Grid2>
        <Grid2 size={{ xs: 4 }}>
          <Typography sx={{ fontSize: '0.875rem', opacity: 0.7 }}>{t('Ratio')}</Typography>
          <Typography sx={{ fontWeight: 700 }}>
            {t('1:')}
            {(liquidityB / liquidityA).toFixed(2)}
          </Typography>
        </Grid2>
      </Grid2>
      <LabTabs
        tokenB={tokenB}
        liquidityToken={liquidityToken}
        onAddLiquidity={onAddLiquidity}
        onRemoveLiquidity={onRemoveLiquidity}
      />
    </Box>
  );
};

export default PoolLiquidityTemp;
