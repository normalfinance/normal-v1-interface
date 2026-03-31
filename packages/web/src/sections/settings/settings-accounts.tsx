'use client';

import type { LinkedWallet } from '@/services/linked-wallets';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { format } from '@normalfinance/utils';
import { unlinkWallet, getLinkedWallets, updateWalletName } from '@/services/linked-wallets';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { useSnackbar } from '@/components/template/snackbar';
import { CustodySettings } from '@/components/settings/custody-settings';
import AddBlendUsdcTrustlineButton from '@/components/settings/add-blend-usdc-trustline-button';
import NormalWalletImport from '@/components/_common/normal-wallet-import';

export function SettingsAccounts() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [walletToUnlink, setWalletToUnlink] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const linkedWallets = await getLinkedWallets();
      setWallets(linkedWallets);
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to load accounts'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const handleEditName = (wallet: LinkedWallet) => {
    setEditingWallet(wallet.walletAddress);
    setWalletName(wallet.walletName || '');
  };

  const handleSaveName = async (walletAddress: string) => {
    try {
      await updateWalletName(walletAddress, walletName);
      enqueueSnackbar(t('Account name updated'), { variant: 'success' });
      setEditingWallet(null);
      await loadWallets();
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to update account name'), { variant: 'error' });
    }
  };

  const handleCancelEdit = () => {
    setEditingWallet(null);
    setWalletName('');
  };

  const handleUnlinkClick = (walletAddress: string) => {
    setWalletToUnlink(walletAddress);
    setUnlinkDialogOpen(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!walletToUnlink) return;

    try {
      setIsUnlinking(true);
      await unlinkWallet(walletToUnlink);
      enqueueSnackbar(t('Account unlinked successfully'), { variant: 'success' });
      setUnlinkDialogOpen(false);
      setWalletToUnlink(null);
      await loadWallets();
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to unlink account'), { variant: 'error' });
    } finally {
      setIsUnlinking(false);
    }
  };

  const filteredWallets = wallets.filter((wallet) => {
    const query = searchQuery.toLowerCase();
    const name = (wallet.walletName || '').toLowerCase();
    const address = wallet.walletAddress.toLowerCase();
    return name.includes(query) || address.includes(query);
  });

  const handleImportSuccess = async () => {
    setShowImportNormalWallet(false);
    await loadWallets();
  };

  if (loading) {
    return (
      <Stack spacing={3}>
        {[1, 2].map((index) => (
          <Card key={index}>
            <CardHeader title={<Skeleton variant="text" width={150} height={28} />} />
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Skeleton variant="text" width={60} />
                  <Skeleton variant="text" width={180} />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Skeleton variant="text" width={70} />
                  <Skeleton variant="text" width={140} />
                </Stack>
                <Skeleton variant="rounded" height={60} />
                <Skeleton variant="rounded" width={120} height={36} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<Iconify icon="solar:import-bold" />}
        onClick={() => setShowImportNormalWallet(true)}
      >
        {t('Import Account')}
      </Button>

      {wallets.length > 0 && (
        <TextField
          size="small"
          fullWidth
          placeholder={t('Search by name or id...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      )}

      {wallets.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
              {t('No linked accounts')}
            </Typography>
          </CardContent>
        </Card>
      ) : filteredWallets.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
              {t('No accounts found')}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        filteredWallets.map((wallet) => (
          <Card key={wallet.id}>
            <CardHeader
              title={
                editingWallet === wallet.walletAddress ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      placeholder={t('Account Name')}
                      sx={{ flex: 1 }}
                    />
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleSaveName(wallet.walletAddress)}
                    >
                      <Iconify icon="solar:check-circle-bold" />
                    </IconButton>
                    <IconButton size="small" onClick={handleCancelEdit}>
                      <Iconify icon="solar:close-circle-bold" />
                    </IconButton>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6">
                      {wallet.walletName || t('Unnamed Account')}
                    </Typography>
                    <IconButton size="small" onClick={() => handleEditName(wallet)}>
                      <Iconify icon="solar:pen-bold" width={18} />
                    </IconButton>
                  </Stack>
                )
              }
            />
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {t('Account ID')}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">
                      {format.fTruncate(wallet.walletAddress, 20)}
                    </Typography>
                    <CopyIconButton value={wallet.walletAddress} alert={t('ID copied')} />
                  </Stack>
                </Stack>

                {wallet.lastUsedAt && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t('Last Used')}
                    </Typography>
                    <Typography variant="body2">
                      {new Date(wallet.lastUsedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                )}

                <Box sx={{ mt: 2 }}>
                  <CustodySettings
                    walletAddress={wallet.walletAddress}
                    walletName={wallet.walletName}
                    custodyChoice={wallet.custodyChoice}
                    onUpdate={loadWallets}
                  />
                </Box>

                <AddBlendUsdcTrustlineButton walletAddress={wallet.walletAddress} />

                <Button
                  variant="soft"
                  color="error"
                  size="small"
                  startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  onClick={() => handleUnlinkClick(wallet.walletAddress)}
                >
                  {t('Disconnect Account')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={unlinkDialogOpen} onClose={() => !isUnlinking && setUnlinkDialogOpen(false)}>
        <DialogTitle>{t('Disconnect Account')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('Are you sure you want to disconnect this account? This action cannot be undone.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlinkDialogOpen(false)} disabled={isUnlinking}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleUnlinkConfirm}
            disabled={isUnlinking}
            startIcon={isUnlinking ? <CircularProgress size={16} /> : null}
          >
            {isUnlinking ? t('Disconnecting...') : t('Disconnect')}
          </Button>
        </DialogActions>
      </Dialog>
      <NormalWalletImport
        open={showImportNormalWallet}
        onClose={() => setShowImportNormalWallet(false)}
        onSuccess={handleImportSuccess}
        showLinkedWallets={false}
      />
    </Stack>
  );
}
