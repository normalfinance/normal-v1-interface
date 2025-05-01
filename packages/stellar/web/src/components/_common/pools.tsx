import type { Token } from '@/types/token';

import React from 'react';

import { Box, Grid2, Typography } from '@mui/material';

const PoolItem = React.memo(
  ({
    pool,
    onAddLiquidityClick,
    onShowDetailsClick,
  }: {
    pool: Pool;
    onAddLiquidityClick: (pool: Pool) => void;
    onShowDetailsClick: (pool: Pool) => void;
  }) => (
    <Grid2
      item
      xs={12}
      sm={6}
      md={4}
      lg={3}
      xl={3}
      onClick={() => onShowDetailsClick(pool)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Box
        sx={{
          padding: '24px',
          borderRadius: '20px',
          background:
            'var(--Secondary-S3, linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%))',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Logos in the background */}
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '120px',
            height: '120px',
            opacity: 0.1,
            background: `url(${pool.tokens[0].icon}) center / cover no-repeat`,
            filter: 'grayscale(100%)',
            borderRadius: '50%',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '120px',
            height: '120px',
            opacity: 0.1,
            background: `url(${pool.tokens[1].icon}) center / cover no-repeat`,
            filter: 'grayscale(100%)',
            borderRadius: '50%',
          }}
        />

        {/* Pool Information */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              width: '36px',
              height: '36px',
              padding: '4px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '32px',
              background:
                'var(--Secondary-S3, linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%))',
            }}
          >
            <Box
              sx={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: `url(${pool.tokens[0].icon}) transparent 50% / cover no-repeat`,
              }}
            />
          </Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '20px',
              color: '#fff',
            }}
          >
            {`${pool.tokens[0].name} - ${pool.tokens[1].name}`}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              width: '36px',
              height: '36px',
              padding: '4px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '32px',
              background:
                'var(--Secondary-S3, linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%))',
            }}
          >
            <Box
              sx={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: `url(${pool.tokens[1].icon}) transparent 50% / cover no-repeat`,
              }}
            />
          </Box>
        </Box>

        {/* Pool Stats */}
        <Grid2 container rowSpacing={1} sx={{ zIndex: 1 }}>
          <Grid2 item xs={6}>
            <Typography
              sx={{
                color: 'var(--Secondary-S2-2, #BDBEBE)',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              TVL
            </Typography>
          </Grid2>
          <Grid2 item xs={6} textAlign="right">
            <Typography
              sx={{
                color: 'var(--Secondary-S2, #FFF)',
                fontSize: '18px',
                fontWeight: 700,
              }}
            >
              {pool.tvl}
            </Typography>
          </Grid2>
          <Grid2 item xs={6}>
            <Typography
              sx={{
                color: 'var(--Secondary-S2-2, #BDBEBE)',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              Max APR
            </Typography>
          </Grid2>
          <Grid2 item xs={6} textAlign="right">
            <Typography
              sx={{
                color: 'var(--Secondary-S2, #FFF)',
                fontSize: '18px',
                fontWeight: 700,
              }}
            >
              {pool.maxApr}
            </Typography>
          </Grid2>
          {filter === 'MY' && (
            <>
              <Grid2 item xs={6}>
                <Typography
                  sx={{
                    color: 'var(--Secondary-S2-2, #BDBEBE)',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  My Liquidity
                </Typography>
              </Grid2>
              <Grid2 item xs={6} textAlign="right">
                <Typography
                  sx={{
                    color: 'var(--Secondary-S2, #FFF)',
                    fontSize: '18px',
                    fontWeight: 700,
                  }}
                >
                  {pool.userLiquidity}
                </Typography>
              </Grid2>
            </>
          )}
        </Grid2>
      </Box>
    </Grid2>
  )
);

export interface Pool {
  tokens: Token[];
  tvl: string;
  maxApr: string;
  userLiquidity: number;
  poolAddress: string;
}

type PoolsProps = {
  pools: Pool[];
  onAddLiquidityClick: (pool: Pool) => void;
  onShowDetailsClick: (pool: Pool) => void;
};

const Pools: React.FC<PoolsProps> = ({
  pools,
  onAddLiquidityClick,
  onShowDetailsClick,
}: PoolsProps) => (
  <Box sx={{ flex: 1 }}>
    <Typography
      sx={{
        color: '#FFF',
        fontSize: '32px',
        fontWeight: 700,
        marginBottom: '16px',
      }}
    >
      Pools
    </Typography>

    <Grid2 container spacing={3}>
      {pools.map((pool, index) => (
        <PoolItem
          key={index}
          onAddLiquidityClick={() => onAddLiquidityClick(pool)}
          onShowDetailsClick={onShowDetailsClick}
          pool={pool}
        />
      ))}
    </Grid2>
  </Box>
);

export default Pools;
