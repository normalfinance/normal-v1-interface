'use client';

import type { Token } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fNumber, fCurrency } from '@/utils/format-number';

import Box from '@mui/material/Box';
import { Chip, Skeleton, Typography } from '@mui/material';

export interface ToeknsTabsProps {
  tokens?: Token[];
  loading?: boolean;
}

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.01em',
} as const;

export default function TokensTab({ tokens = [], loading = false }: ToeknsTabsProps) {
  const { t } = useTranslate('auto');
  const router = useRouter();

  // Stellar tokens (XLM/USDC) arrive on a different path than the native-chain
  // assets, so without this the list renders BTC/ETH/SOL immediately and the
  // rest appear a beat later. Show rows as loading until the whole set is in.
  if (loading) {
    return (
      <Box sx={{ pb: 2, bgcolor: 'background.paper' }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              padding: '12px 8px',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box display="flex" alignItems="center" gap="12px">
              <Skeleton variant="circular" width={32} height={32} />
              <Box>
                <Skeleton variant="text" width={64} height={18} />
                <Skeleton variant="text" width={44} height={14} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Skeleton variant="text" width={58} height={18} />
              <Skeleton variant="text" width={40} height={14} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 2, bgcolor: 'background.paper' }}>
      {tokens.length > 0 ? (
        [...tokens]
          .sort((a, b) => {
            // Biggest holdings first, by USD value (price × balance) — not coin count.
            const aUsd = BigNumber(a.price).multipliedBy(a.balance);
            const bUsd = BigNumber(b.price).multipliedBy(b.balance);
            return bUsd.minus(aUsd).toNumber();
          })
          .map((token) => (
            <Box
              key={token.contract}
              role="button"
              tabIndex={0}
              // Savings is a product, not a chain asset — its row opens the
              // savings page, never a (nonexistent) /assets/Savings detail.
              onClick={() =>
                router.push(
                  token.contract === '__savings__'
                    ? paths.savings
                    : paths.assets.details(token.symbol)
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  router.push(
                    token.contract === '__savings__'
                      ? paths.savings
                      : paths.assets.details(token.symbol)
                  );
              }}
              sx={{
                display: 'flex',
                padding: '12px 8px',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: '12px',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.03)' },
              }}
            >
              <Box display="flex" alignItems="center" gap="12px">
                <Box
                  component="img"
                  src={token.icon || getCryptoIconUrl(token.symbol)}
                  sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography
                    sx={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0A0A0F',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.3,
                    }}
                  >
                    {token.symbol.startsWith('sn') && (
                      <Chip label="Short" color="error" size="small" variant="soft" />
                    )}{' '}
                    {token.symbol.replace('sn', '')}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#6B6B76', mt: '2px' }}>
                    {token.name}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 400, color: '#0A0A0F', ...MONO }}>
                  {fCurrency(BigNumber(token.price).multipliedBy(token.balance))}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: '#6B6B76', mt: '2px', ...MONO }}>
                  {fNumber(token.balance)} {token.symbol.replace('sn', '')}
                </Typography>
              </Box>
            </Box>
          ))
      ) : (
        <Typography>{t('No assets found.')}</Typography>
      )}
    </Box>
  );
}
