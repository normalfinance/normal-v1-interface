'use client';

import type { LinkedWallet } from '@/services/linked-wallets';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useState, useEffect } from 'react';
import { format } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { CHAINS, CHAIN_IDS } from '@/lib/chains/registry';
import { forgetExternalWallet } from '@/lib/wallet-reconnect-memo';
import { getTurnkeyWalletInfo, type TurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import { unlinkWallet, getLinkedWallets, updateWalletName } from '@/services/linked-wallets';
import { forgetWalletLink, useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { useSnackbar } from '@/components/template/snackbar';
import AutopilotCard from '@/components/settings/autopilot-card';
import WalletExportDialog from '@/components/_common/wallet-export-dialog';
import NormalWalletImport from '@/components/_common/normal-wallet-import';
import AddUsdcTrustlineButton from '@/components/settings/add-usdc-trustline-button';

// ----------------------------------------------------------------------

export function SettingsAccounts() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const config = useStellarConfig();
  const persist = usePersistStore();
  const { disconnectWallet: kitDisconnect } = useStellarWalletsKit();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [walletToUnlink, setWalletToUnlink] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  // #32 chunk 2: the Turnkey (Normal) wallet's Stellar address — its card is
  // labeled and cannot be unlinked (it holds the user's funds; the server
  // refuses too, this just keeps the button honest).
  const [turnkeyStellar, setTurnkeyStellar] = useState<string | null>(null);
  // Niko 2026-08-21: the Normal wallet card lists EVERY chain address it
  // holds, labeled by chain — not just the Stellar one.
  const [turnkeyInfo, setTurnkeyInfo] = useState<TurnkeyWalletInfo | null>(null);

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
    getTurnkeyWalletInfo()
      .then((info) => {
        setTurnkeyStellar(info?.stellarAddress ?? null);
        setTurnkeyInfo(info);
      })
      .catch(() => {});
    // Mount-only load; loadWallets is recreated per render — listing it would refire
    // the fetch on every render. eslint-disable documents the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditName = (wallet: LinkedWallet) => {
    setEditingWallet(wallet.walletAddress);
    setWalletName(wallet.walletName || '');
  };

  const handleSaveName = async (walletAddress: string) => {
    setIsSavingName(true);
    try {
      await updateWalletName(walletAddress, walletName);
      enqueueSnackbar(t('Account name updated'), { variant: 'success' });
      setEditingWallet(null);
      await loadWallets();
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to update account name'), { variant: 'error' });
    } finally {
      setIsSavingName(false);
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
      // Unlinking the wallet that is CURRENTLY CONNECTED must also disconnect
      // it (Niko 2026-08-22). Otherwise the app kept showing its tabs, source
      // pills and labels while the DB row was gone — so ownership checks
      // failed (403s) and the next page load silently RE-LINKED it, undoing
      // the unlink. Forget the session memo too, or a reconnect would skip
      // re-linking and leave it connected-but-unowned.
      if (walletToUnlink === persist.wallet.address) {
        forgetWalletLink(walletToUnlink);
        forgetExternalWallet(); // explicit disconnect: do NOT re-attach on next login

        try {
          await kitDisconnect();
        } catch {
          /* the kit may already be disconnected — the slot clear below is what matters */
        }
        persist.disconnectWallet();
      }
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
      <Stack spacing={2}>
        {[1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              p: '22px',
              borderRadius: '22px',
              border: '1px solid rgba(10,10,15,0.08)',
              bgcolor: '#FFFFFF',
            }}
          >
            <Skeleton variant="text" width={160} height={24} sx={{ mb: '16px' }} />
            <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)', mb: '16px' }} />
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between">
                <Skeleton variant="text" width={80} />
                <Skeleton variant="text" width={160} />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Skeleton variant="text" width={70} />
                <Skeleton variant="text" width={120} />
              </Stack>
              <Skeleton variant="rounded" height={44} sx={{ borderRadius: '12px', mt: '8px' }} />
            </Stack>
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Import button */}
      <Box>
        <Box
          component="button"
          onClick={() => setShowImportNormalWallet(true)}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            px: '16px',
            py: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(10,10,15,0.12)',
            bgcolor: '#FFFFFF',
            color: '#0A0A0F',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 150ms ease',
            '&:hover': { bgcolor: '#F4F4F7' },
          }}
        >
          <Iconify icon="solar:import-bold" width={17} />
          {t('Import Account')}
        </Box>
      </Box>

      {/* Search */}
      {wallets.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            px: '14px',
            py: '10px',
            borderRadius: '12px',
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(10,10,15,0.08)',
            '&:focus-within': { borderColor: 'rgba(10,10,15,0.24)' },
            transition: 'border-color 150ms ease',
          }}
        >
          <Iconify
            icon="eva:search-fill"
            width={17}
            sx={{ color: 'rgba(10,10,15,0.3)', flexShrink: 0 }}
          />
          <Box
            component="input"
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={t('Search by name or ID...')}
            sx={{
              flex: 1,
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              fontSize: '14px',
              color: '#0A0A0F',
              fontFamily: 'inherit',
              '&::placeholder': { color: 'rgba(10,10,15,0.3)' },
            }}
          />
        </Box>
      )}

      {/* Empty states */}
      {wallets.length === 0 && (
        <Box
          sx={{
            p: '40px 22px',
            borderRadius: '22px',
            border: '1px solid rgba(10,10,15,0.08)',
            bgcolor: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.4)' }}>
            {t('No linked accounts')}
          </Typography>
        </Box>
      )}

      {wallets.length > 0 && filteredWallets.length === 0 && (
        <Box
          sx={{
            p: '40px 22px',
            borderRadius: '22px',
            border: '1px solid rgba(10,10,15,0.08)',
            bgcolor: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.4)' }}>
            {t('No accounts found')}
          </Typography>
        </Box>
      )}

      {/* Wallet cards */}
      {filteredWallets.map((wallet) => (
        <Box
          key={wallet.id}
          sx={{
            p: '22px',
            borderRadius: '22px',
            border: '1px solid rgba(10,10,15,0.08)',
            bgcolor: '#FFFFFF',
          }}
        >
          {/* Header: name + edit */}
          {editingWallet === wallet.walletAddress ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: '16px' }}>
              <Box
                component="input"
                type="text"
                value={walletName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalletName(e.target.value)}
                placeholder={t('Account Name')}
                sx={{
                  flex: 1,
                  px: '12px',
                  py: '8px',
                  border: '1px solid rgba(10,10,15,0.16)',
                  borderRadius: '10px',
                  bgcolor: '#FAFAFB',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0A0A0F',
                  fontFamily: 'inherit',
                  outline: 'none',
                  '&:focus': { borderColor: 'rgba(10,10,15,0.3)' },
                }}
              />
              <Box
                component="button"
                onClick={() => handleSaveName(wallet.walletAddress)}
                disabled={isSavingName}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: 'none',
                  bgcolor: '#0A0A0F',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isSavingName ? 'not-allowed' : 'pointer',
                  opacity: isSavingName ? 0.5 : 1,
                }}
              >
                {isSavingName ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <Iconify icon="solar:check-circle-bold" width={16} />
                )}
              </Box>
              <Box
                component="button"
                onClick={handleCancelEdit}
                disabled={isSavingName}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: 'none',
                  bgcolor: 'rgba(10,10,15,0.06)',
                  color: '#0A0A0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isSavingName ? 'not-allowed' : 'pointer',
                }}
              >
                <Iconify icon="solar:close-circle-bold" width={16} />
              </Box>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: '16px' }}>
              <Typography
                sx={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0A0A0F',
                  letterSpacing: '-0.01em',
                  flex: 1,
                }}
              >
                {wallet.walletAddress === turnkeyStellar
                  ? wallet.walletName || t('Normal wallet')
                  : wallet.walletName || t('Unnamed Account')}
              </Typography>
              {wallet.walletAddress === turnkeyStellar && (
                <Box
                  sx={{
                    px: '8px',
                    py: '2px',
                    borderRadius: '999px',
                    bgcolor: 'rgba(10,10,15,0.06)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2A2A33',
                    flexShrink: 0,
                  }}
                >
                  {t('Normal wallet')}
                </Box>
              )}
              <Box
                component="button"
                onClick={() => handleEditName(wallet)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '8px',
                  border: 'none',
                  bgcolor: 'rgba(10,10,15,0.06)',
                  color: '#0A0A0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                }}
              >
                <Iconify icon="solar:pen-bold" width={14} />
              </Box>
            </Stack>
          )}

          <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)', mb: '16px' }} />

          {/* Details */}
          <Stack spacing={0} sx={{ mb: '16px' }}>
            {wallet.walletAddress === turnkeyStellar && turnkeyInfo ? (
              // The Normal wallet holds one address per chain — list them all,
              // each labeled by its chain (registry-driven: a new chain shows
              // up here automatically).
              CHAIN_IDS.filter((id) => !!turnkeyInfo[CHAINS[id].addressField]).map((id) => (
                <Box
                  key={id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: '10px',
                    borderBottom: '1px solid rgba(10,10,15,0.06)',
                  }}
                >
                  <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                    {t('{{chain}} address', { chain: CHAINS[id].name })}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#0A0A0F',
                        fontFamily: '"Geist Mono", "Courier New", monospace',
                      }}
                    >
                      {format.fTruncate(turnkeyInfo[CHAINS[id].addressField]!, 20)}
                    </Typography>
                    <CopyIconButton
                      value={turnkeyInfo[CHAINS[id].addressField]!}
                      alert={t('Address copied')}
                    />
                  </Stack>
                </Box>
              ))
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: '10px',
                  borderBottom: '1px solid rgba(10,10,15,0.06)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                  {t('Account ID')}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0A0A0F',
                      fontFamily: '"Geist Mono", "Courier New", monospace',
                    }}
                  >
                    {format.fTruncate(wallet.walletAddress, 20)}
                  </Typography>
                  <CopyIconButton value={wallet.walletAddress} alert={t('ID copied')} />
                </Stack>
              </Box>
            )}

            {wallet.lastUsedAt && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: '10px',
                  borderBottom: '1px solid rgba(10,10,15,0.06)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                  {t('Last Used')}
                </Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0F' }}>
                  {new Date(wallet.lastUsedAt).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* #33: automatic swap completion (autopilot) */}
          <AutopilotCard />

          {/* Recovery-phrase export (doc 79) — Normal wallet only; external
              wallets keep their keys in their own app, nothing to export. */}
          {wallet.walletAddress === turnkeyStellar && (
            <Box
              component="button"
              onClick={() => setExportOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                mb: '16px',
                px: '14px',
                py: '11px',
                borderRadius: '12px',
                border: '1px solid rgba(10,10,15,0.12)',
                bgcolor: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.03)' },
              }}
            >
              <Iconify icon="solar:key-bold" width={18} sx={{ color: '#0A0A0F' }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F' }}>
                  {t('Export recovery phrase')}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                  {t('One phrase backs up all four addresses above — restores in any wallet app')}
                </Typography>
              </Box>
              <Iconify
                icon="eva:chevron-right-fill"
                width={18}
                sx={{ color: 'rgba(10,10,15,0.35)' }}
              />
            </Box>
          )}

          {/* Trustline buttons */}
          <Stack spacing={1} sx={{ mb: '16px' }}>
            <AddUsdcTrustlineButton
              walletAddress={wallet.walletAddress}
              assetIssuer={config.USDC_ISSUER}
              label={t('Add Stellar USDC Trustline')}
              loadingLabel={t('Adding trustline...')}
              successMessage={t('Stellar USDC trustline added!')}
              errorFallback={t('Failed to add Stellar USDC trustline')}
              showInactiveAccountHelper
            />

            {config.BLEND_USDC_ISSUER && (
              <AddUsdcTrustlineButton
                walletAddress={wallet.walletAddress}
                assetIssuer={config.BLEND_USDC_ISSUER}
                label={t('Add Blend USDC Trustline')}
                loadingLabel={t('Adding trustline...')}
                successMessage={t('Blend USDC trustline added!')}
                errorFallback={t('Failed to add Blend USDC trustline')}
                showInactiveAccountHelper={!config.USDC_ISSUER}
              />
            )}
          </Stack>

          {/* Disconnect — never offered for the Normal wallet: it holds the
              user's funds and backs the ownership checks swap logging uses
              (the server refuses the unlink as well). */}
          {wallet.walletAddress === turnkeyStellar ? (
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.5 }}>
              {t('This is your Normal wallet — it stays linked to your account.')}
            </Typography>
          ) : (
            <Box
              component="button"
              onClick={() => handleUnlinkClick(wallet.walletAddress)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                px: '12px',
                py: '8px',
                borderRadius: '10px',
                border: '1px solid rgba(239,68,68,0.2)',
                bgcolor: 'rgba(239,68,68,0.04)',
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms ease',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
              }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={15} />
              {t('Disconnect Account')}
            </Box>
          )}
        </Box>
      ))}

      {/* Unlink confirmation dialog */}
      <Dialog
        open={unlinkDialogOpen}
        onClose={() => !isUnlinking && setUnlinkDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
      >
        <DialogTitle sx={{ px: '22px', pt: '22px', pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}
            >
              {t('Disconnect Account')}
            </Typography>
            <Box
              component="button"
              onClick={() => setUnlinkDialogOpen(false)}
              disabled={isUnlinking}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                border: 'none',
                bgcolor: 'rgba(10,10,15,0.06)',
                color: '#0A0A0F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isUnlinking ? 'not-allowed' : 'pointer',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
              }}
            >
              <Iconify icon="mingcute:close-line" width={16} />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: '22px', pt: '16px', pb: '8px' }}>
          <Box
            sx={{
              display: 'flex',
              gap: '10px',
              p: '14px',
              borderRadius: '12px',
              bgcolor: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <Iconify
              icon="eva:alert-triangle-outline"
              width={16}
              sx={{ color: '#DC2626', flexShrink: 0, mt: '1px' }}
            />
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}>
              {t('Are you sure you want to disconnect this account? This action cannot be undone.')}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: '22px', pb: '22px', pt: '16px', gap: '8px' }}>
          <Box
            component="button"
            onClick={() => setUnlinkDialogOpen(false)}
            disabled={isUnlinking}
            sx={{
              flex: 1,
              py: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(10,10,15,0.12)',
              bgcolor: '#FFFFFF',
              color: '#0A0A0F',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isUnlinking ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: isUnlinking ? 0.5 : 1,
              '&:hover': { bgcolor: '#F4F4F7' },
            }}
          >
            {t('Cancel')}
          </Box>
          <Button
            variant="contained"
            onClick={handleUnlinkConfirm}
            disabled={isUnlinking}
            startIcon={
              isUnlinking ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <Iconify icon="solar:trash-bin-trash-bold" width={15} />
              )
            }
            sx={{
              flex: 1,
              py: '12px',
              borderRadius: '12px',
              bgcolor: '#DC2626',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'none',
              letterSpacing: '-0.01em',
              '&:hover': { bgcolor: '#B91C1C' },
              '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
            }}
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

      <WalletExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </Stack>
  );
}
