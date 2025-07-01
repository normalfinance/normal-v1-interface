'use client';

import type { Token } from '@/types/token';

import { useTranslate } from '@/locales';
import { varAlpha } from 'minimal-shared/utils';
import { fPercent, fCurrency } from '@/utils/format-number';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Stack, Button, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export interface ToeknsTabsProps {
  tokens?: Token[];
}

export default function TokensTab({ tokens = [] }: { tokens?: Token[] }) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box sx={{ p: 2, pt: 0 }}>
      {tokens.length > 0 ? (
        tokens?.map((token) => (
          <Button
            key={token.id}
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
                src={token.logo ?? token.url}
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
                  {token.name}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.secondary,
                      fontSize: '12px',
                    }}
                  >
                    {token.countstatus.toFixed(4)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.secondary,
                      fontSize: '12px',
                    }}
                  >
                    {token.shortname}
                  </Typography>
                </Box>
              </Box>
            </Box>
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
                  {fCurrency(token.countstatus * token.pricestatus)}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" mt="4px">
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
                </Stack>
              </Box>
            </Box>
          </Button>
        ))
      ) : (
        <Typography>{t('No tokens match your search.')}</Typography>
      )}
    </Box>
  );
}
