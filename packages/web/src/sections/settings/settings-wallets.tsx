'use client';

import { useState, useEffect } from 'react';
import { useTranslate } from '@/locales';
import { useSnackbar } from '@/components/template/snackbar';
import { getLinkedWallets, unlinkWallet, updateWalletName, LinkedWallet } from '@/services/linked-wallets';
import { CustodySettings } from '@/components/settings/custody-settings';
import { format } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';

export function SettingsWallets() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [walletToUnlink, setWalletToUnlink] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadWallets = async () => {
    try {
      setLoading(true);
      const linkedWallets = await getLinkedWallets();
      setWallets(linkedWallets);
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to load wallets'), { variant: 'error' });
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
      enqueueSnackbar(t('Wallet name updated'), { variant: 'success' });
      setEditingWallet(null);
      await loadWallets();
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to update wallet name'), { variant: 'error' });
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
      enqueueSnackbar(t('Wallet unlinked successfully'), { variant: 'success' });
      setUnlinkDialogOpen(false);
      setWalletToUnlink(null);
      await loadWallets();
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to unlink wallet'), { variant: 'error' });
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {wallets.length > 0 && (
        <TextField
          size="small"
          fullWidth
          placeholder={t('Search by name or address...')}
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
              {t('No linked wallets')}
            </Typography>
          </CardContent>
        </Card>
      ) : filteredWallets.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
              {t('No wallets found')}
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
                      placeholder={t('Wallet Name')}
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
                    <Typography variant="h6">{wallet.walletName || t('Unnamed Wallet')}</Typography>
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
                    {t('Address')}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{format.fTruncate(wallet.walletAddress, 20)}</Typography>
                    <CopyIconButton value={wallet.walletAddress} alert={t('Address copied')} />
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

                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  onClick={() => handleUnlinkClick(wallet.walletAddress)}
                >
                  {t('Unlink Wallet')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={unlinkDialogOpen} onClose={() => !isUnlinking && setUnlinkDialogOpen(false)}>
        <DialogTitle>{t('Unlink Wallet')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('Are you sure you want to unlink this wallet? This action cannot be undone.')}
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
            {isUnlinking ? t('Unlinking...') : t('Unlink')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

