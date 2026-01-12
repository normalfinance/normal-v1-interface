'use client';

import copy from 'copy-to-clipboard';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { logger } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { ReferralAPI, getReferralAPIErrorMessage } from '@/lib/referral-api';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import { Grid2, Paper, Alert, Button, CircularProgress } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export interface Referral {
  id: string;
  address: string;
  joined: string;
  points: number;
}

export interface RewardsOverviewProps {
  referralsCount: number;
  referrals: Referral[];
}

export function RewardsOverview({ referralsCount, referrals }: RewardsOverviewProps) {
  const { t } = useTranslate();
  const walletAddress = usePersistStore((s) => s.wallet.address);

  const [copied, setCopied] = useState<string | null>(null); // Track which code was copied
  const [existingReferrals, setExistingReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing referral codes when component mounts or wallet changes
  useEffect(() => {
    if (walletAddress) {
      fetchExistingReferrals();
    } else {
      setExistingReferrals([]);
    }
  }, [walletAddress]);

  const fetchExistingReferrals = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await ReferralAPI.getUserReferrals(walletAddress);
      setExistingReferrals(response.user?.referralsGiven || []);
      logger.log(
        '[referral] Loaded existing referrals:',
        response.user?.referralsGiven?.length || 0
      );
    } catch (err: any) {
      logger.error('[referral] Error fetching existing referrals:', err);
      // Don't show error for user not found (new users)
      if (!err?.response?.data?.error?.includes('User not found')) {
        setError(getReferralAPIErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReferralCode = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (hasMaxLinks) {
      setError('Too many referral links');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await ReferralAPI.createReferralCode({
        referrerWalletAddress: walletAddress,
      });

      // Add the new referral to the existing list
      setExistingReferrals((prev) => [response.referral, ...prev]);
      logger.log('[referral] Generated referral code:', response.referral.code);
    } catch (err) {
      logger.error('[referral] Error generating code:', err);
      setError(getReferralAPIErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    const referralLink = `${window.location.origin}?ref=${code}`;
    copy(referralLink);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasMaxLinks = existingReferrals.length >= 1;

  return (
    <Stack spacing={3}>
      <Grid2 container columnSpacing={3} rowSpacing={3} alignItems="flex-start">
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Paper
              variant="outlined"
              sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'grey.100',
                borderRadius: 3,
                height: 'fit-content',
                minHeight: 135, // Match approximate height of stats boxes
              }}
            >
              {isLoading ? (
                <Stack
                  sx={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 120,
                  }}
                >
                  <CircularProgress size={24} />
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    {t('Loading...')}
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={1} sx={{ flex: 1, height: 'content' }}>
                  {/* Existing Referral Codes */}
                  {existingReferrals.length > 0 && (
                    <Stack spacing={0.5} sx={{ maxHeight: 120, padding: 0 }}>
                      {existingReferrals
                        .filter((referral) => referral.isUsed === false)
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .slice(0, 2)
                        .map((referral) => {
                          logger.log(referral, 'referral object');
                          const referralLink = `${window.location.origin}?ref=${referral.code}`;
                          const isCopied = copied === referral.code;

                          return (
                            <Stack
                              key={referral.id}
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{
                                px: 1.5,
                                py: 0.2,
                                backgroundColor: 'background.paper',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    wordBreak: 'break-all',
                                    fontSize: '0.65rem',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {referralLink}
                                </Typography>
                              </Stack>
                              <Tooltip title={isCopied ? t('Copied!') : t('Copy')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopy(referral.code)}
                                  color="primary"
                                >
                                  <Iconify
                                    icon={isCopied ? 'solar:check-circle-bold' : 'solar:copy-bold'}
                                    width={18}
                                  />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          );
                        })}
                    </Stack>
                  )}

                  {/* Generate Button Section */}
                  {!hasMaxLinks && (
                    <Stack
                      spacing={1}
                      alignItems="center"
                      sx={{
                        mt: 'auto',
                        pt: existingReferrals.length > 0 ? 1 : 0,
                        borderTop: existingReferrals.length > 0 ? '1px dashed' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Button
                        size="small"
                        variant={existingReferrals.length > 0 ? 'outlined' : 'contained'}
                        onClick={handleGenerateReferralCode}
                        disabled={isGenerating || !walletAddress || hasMaxLinks}
                        startIcon={
                          isGenerating ? (
                            <CircularProgress size={16} />
                          ) : (
                            <Iconify icon="solar:add-circle-bold" width={16} />
                          )
                        }
                      >
                        {isGenerating ? t('Generating...') : t('Generate New Link')}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Grid2 container spacing={3}>
            {[{ label: t('Referrals'), value: referralsCount }].map((stat) => (
              <Grid2 size={{ xs: 12, md: 4 }} key={stat.label}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    backgroundColor: 'grey.100',
                    borderRadius: 3,
                  }}
                >
                  <Typography variant="h3">{stat.value}</Typography>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid2>
            ))}
          </Grid2>
        </Grid2>
      </Grid2>

      <Typography variant="h3" color="text.primary">
        {t('Your Referrals')}
      </Typography>
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{`${t('Wallet')} / ${t('User')}`}</TableCell>

              <TableCell align="right">{t('Joined')}</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {referrals.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.address}</TableCell>
                <TableCell align="right">{r.joined}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
