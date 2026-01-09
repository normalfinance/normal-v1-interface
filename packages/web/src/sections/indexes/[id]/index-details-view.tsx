'use client';

import type { IndexFundContract } from '@normalfinance/contracts';

import { useState } from 'react';
import { useIndexFund } from '@/hooks';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { createIndexSummary, getIndexStatusLabel, getIndexStatusColor } from '@/utils/index-mapper';

import Grid2 from '@mui/material/Grid2';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Stack,
  Alert,
  Button,
  Dialog,
  Divider,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';

import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';

interface Props {
  id: number;
  index: IndexFundContract.IndexFundInfo;
}

export default function IndexDetailsView({ id, index }: Props) {
  const { t } = useTranslate();
  const theme = useTheme();
  const { wallet } = usePersistStore();

  const { mintIndex, redeemIndex, loading } = useIndexFund(id);

  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

  const summary = createIndexSummary(index, index.address, 0);

  const handleMint = async () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) return;

    try {
      // Use XLM (native token) as the default token for minting
      await mintIndex({
        token: 'native',
        amount: parseFloat(mintAmount),
      });
      setMintDialogOpen(false);
      setMintAmount('');
    } catch (error) {
      console.error('Mint failed:', error);
    }
  };

  const handleRedeem = async () => {
    if (!redeemAmount || parseFloat(redeemAmount) <= 0) return;

    try {
      await redeemIndex({ share_amount: parseFloat(redeemAmount) });
      setRedeemDialogOpen(false);
      setRedeemAmount('');
    } catch (error) {
      console.error('Redeem failed:', error);
    }
  };

  const isWalletConnected = !!wallet.address;
  const isManager = wallet.address === index.admin_address;

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading={`Index #${summary.sequence}`}
          links={[{ name: t('Indexes'), href: paths.indexes.root }, { name: `Index ${id}...` }]}
          sx={{ mb: 3 }}
        />

        <Grid2 container spacing={3}>
          {/* Main Info Card */}
          <Grid2 size={{ xs: 12, md: 8 }}>
            <Card
              sx={{
                p: 4,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Stack spacing={3}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="h5">{t('Overview')}</Typography>
                  <Chip
                    label={getIndexStatusLabel(index)}
                    color={getIndexStatusColor(index)}
                    size="small"
                    sx={{ borderRadius: 9999, px: 1 }}
                  />
                </Box>

                <Divider />

                {/* Stats Grid */}
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('Total Shares')}
                      </Typography>
                      <Typography variant="h6">{summary.totalShares.toLocaleString()}</Typography>
                    </Stack>
                  </Grid2>
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('Base NAV')}
                      </Typography>
                      <Typography variant="h6">{summary.baseNav.toLocaleString()}</Typography>
                    </Stack>
                  </Grid2>
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('Share Price')}
                      </Typography>
                      <Typography variant="h6">{summary.sharePrice.toLocaleString()}</Typography>
                    </Stack>
                  </Grid2>
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('Total Investments')}
                      </Typography>
                      <Typography variant="h6">{summary.totalDeposits.toLocaleString()}</Typography>
                    </Stack>
                  </Grid2>
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('Total Redemptions')}
                      </Typography>
                      <Typography variant="h6">
                        {summary.totalWithdrawals.toLocaleString()}
                      </Typography>
                    </Stack>
                  </Grid2>
                  <Grid2 size={{ xs: 6, sm: 4 }}>
                    <Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('Accumulated Fees')}
                      </Typography>
                      <Typography variant="h6">
                        {summary.accumulatedFees.toLocaleString()}
                      </Typography>
                    </Stack>
                  </Grid2>
                </Grid2>

                <Divider />

                {/* Contract Details */}
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{t('Contract Details')}</Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {t('Index Id / Address')}:
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {index.address} / {id.toString()}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {t('Manager')}:
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {index.admin_address}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {t('Token')}:
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {index.token_address}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {t('Public')}:
                    </Typography>
                    <Typography variant="body2">{index.is_public ? t('Yes') : t('No')}</Typography>

                    {summary.lastRebalanceDate && (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {t('Last Rebalance')}:
                        </Typography>
                        <Typography variant="body2">
                          {summary.lastRebalanceDate.toLocaleDateString()}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Stack>
              </Stack>
            </Card>
          </Grid2>

          {/* Actions Card */}
          <Grid2 size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                p: 4,
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            >
              <Stack spacing={3}>
                <Typography variant="h6">{t('Actions')}</Typography>

                {!isWalletConnected && (
                  <Alert severity="info">{t('Login to use this index fund')}</Alert>
                )}

                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={() => setMintDialogOpen(true)}
                    disabled={!isWalletConnected || loading}
                  >
                    {loading ? <CircularProgress size={20} /> : t('Deposit')}
                  </Button>

                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    onClick={() => setRedeemDialogOpen(true)}
                    disabled={!isWalletConnected || loading}
                  >
                    {loading ? <CircularProgress size={20} /> : t('Withdraw')}
                  </Button>
                </Stack>

                {/* Status indicators */}
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Deposits')}
                    </Typography>
                    <Chip label={t('Enabled')} color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Withdrawal')}
                    </Typography>
                    <Chip label={t('Enabled')} color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Rebalancing')}
                    </Typography>
                    <Chip label={t('Enabled')} color="success" size="small" />
                  </Box>
                </Stack>

                {isManager && (
                  <>
                    <Divider />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('Manager Actions')}
                    </Typography>
                    <Alert severity="info" sx={{ fontSize: 12 }}>
                      {t('You are the manager of this index fund')}
                    </Alert>
                  </>
                )}
              </Stack>
            </Card>
          </Grid2>
        </Grid2>

        {/* Mint Dialog */}
        <Dialog
          open={mintDialogOpen}
          onClose={() => setMintDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>{t('Deposit')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('Enter the amount you want to invest.')}
              </Typography>
              <TextField
                label={t('Amount (USD)')}
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMintDialogOpen(false)}>{t('Cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleMint}
              disabled={loading || !mintAmount || parseFloat(mintAmount) <= 0}
            >
              {loading ? <CircularProgress size={20} /> : t('Deposit')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Redeem Dialog */}
        <Dialog
          open={redeemDialogOpen}
          onClose={() => setRedeemDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>{t('Withdraw')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('Enter the amount of shares you want to withdraw.')}
              </Typography>
              <TextField
                label={t('Share Amount')}
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.0000001' }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRedeemDialogOpen(false)}>{t('Cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleRedeem}
              disabled={loading || !redeemAmount || parseFloat(redeemAmount) <= 0}
            >
              {loading ? <CircularProgress size={20} /> : t('Withdraw')}
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardContent>
    </Box>
  );
}
