'use client';

import type { Token } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency, fNumber } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Chip, Typography } from '@mui/material';

export interface ToeknsTabsProps {
  tokens?: Token[];
}

export default function TokensTab({ tokens = [] }: { tokens?: Token[] }) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      {tokens.length > 0 ? (
        [...tokens]
          .sort((a, b) => {
            const aBal = a.balance;
            const bBal = b.balance;
            return BigNumber(bBal).minus(aBal).toNumber();
          })
          .map((token) => (
            <Box
              key={token.contract}
              sx={{
                display: 'flex',
                padding: '16px 0px',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center" gap="10px">
                <Box
                  component="img"
                  src={token.icon ?? getCryptoIconUrl(token.symbol)}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                  >
                    {token.symbol.startsWith('sn') && (
                      <Chip label="Short" color="error" size="small" variant="soft" />
                    )}{' '}
                    {token.symbol.replace('sn', '')}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                    >
                      {fCurrency(BigNumber(token.price).multipliedBy(token.balance))}
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {fNumber(token.balance)} {token.symbol.replace('sn', '')}
                    </Typography>
                    {/* <Stack direction="row" spacing={0.5} alignItems="center" mt="4px">
                      <Box
                        component="span"
                        sx={{
                          width: 16,
                          height: 16,
                          display: 'flex',
                          borderRadius: '50%',
                          position: 'relative',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
                          color: 'success.dark',
                          ...theme.applyStyles('dark', {
                            color: 'success.light',
                          }),
                          ...(token.percentageChange &&
                            token.percentageChange < 0 && {
                              bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
                              color: 'error.dark',
                              ...theme.applyStyles('dark', {
                                color: 'error.light',
                              }),
                            }),
                        }}
                      >
                        <Iconify
                          width={10}
                          icon={
                            token.percentageChange && token.percentageChange < 0
                              ? 'eva:trending-down-fill'
                              : 'eva:trending-up-fill'
                          }
                          color={
                            token.percentageChange && token.percentageChange < 0
                              ? 'error.main'
                              : 'success.main'
                          }
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            token.percentageChange && token.percentageChange < 0
                              ? 'error.main'
                              : 'success.main',
                        }}
                      >
                        {token.percentageChange && token.percentageChange >= 0 && '+'}
                        {fPercent(token.percentageChange && token.percentageChange)}
                      </Typography>
                    </Stack> */}
                  </Box>
                </Box>
              </Box>
            </Box>
          ))
      ) : (
        <Typography>{t('No assets found.')}</Typography>
      )}
    </Box>
  );
}
