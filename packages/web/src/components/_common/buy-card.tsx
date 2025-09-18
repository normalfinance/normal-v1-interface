import type { CardProps } from '@mui/material';
import type { BuyQueryParams } from '@/types/query-params';
import type { StateToken as Token } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import React, { useRef, useState, useEffect } from 'react';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { convertFiatToCoin } from '@/utils/conversion-helpers';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Button, InputBase, Typography } from '@mui/material';

import PickToken from './pick-token';
import { WalletGate } from './wallet-gate';
import CheckoutDialog from './checkout-dialog';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

// 1) verification helpers
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useProofDialogStore } from '@/stores/proof-dialog-store';

interface BuyCardProps extends CardProps {
  tokensList?: Token[];
  cashBalance?: number;
  queryParams?: BuyQueryParams;
}

export interface QuickAmountButton {
  amount: number;
}

const QUICK_BUTTONS: QuickAmountButton[] = [{ amount: 100 }, { amount: 300 }, { amount: 1000 }];

const BuyCard: React.FC<BuyCardProps> = ({ tokensList = [], cashBalance, queryParams }) => {
  const theme = useTheme();
  const { t } = useTranslate();

  // 2) stores + connection/verification state
  const appStore = useAppStore();
  const persist = usePersistStore();
  const { publicKey } = useStellarWalletsKit();
  const connectedAddress = persist.wallet.address || publicKey || null;
  const [verifiedTick, setVerifiedTick] = useState(0);
  const isVerified = !!connectedAddress && isWalletVerifiedForSession(connectedAddress);
  const isConnected = !!connectedAddress;
  const { ensureOpen } = useProofDialogStore();

  // 3) local tokens + chosen token
  const [tokens, setTokens] = useState<Token[]>([]);
  const [buyToken, setBuyToken] = useState<Token | null>(null);

  // 4) amount + popup state
  const [amount, setAmount] = useState<string>('0');
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // 5) width measurement
  const [inputWidth, setInputWidth] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  // 6) derived values
  const fiatValue = parseFloat(amount) || 0;
  const buyableAmt =
    buyToken && fiatValue > 0 ? convertFiatToCoin(fiatValue, buyToken.usdValue) : 0;

  // 7) review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  // 8) auto-open proof dialog when a wallet connects but is not verified
  useEffect(() => {
    if (!connectedAddress) return;
    if (!isVerified) ensureOpen('drawer');
  }, [connectedAddress, isVerified, ensureOpen]);

  // 9) refresh tokens after verification event
  useEffect(() => {
    const onVerified = (e: any) => {
      if (!connectedAddress || e?.detail?.address !== connectedAddress) return;
      setVerifiedTick((x) => x + 1);
      appStore
        .getAllTokens()
        .catch((err) => console.error('[BuyCard] getAllTokens after verify error:', err));
    };
    window.addEventListener('nf:walletVerified', onVerified);
    return () => window.removeEventListener('nf:walletVerified', onVerified);
  }, [connectedAddress, appStore]);

  // 10) adopt tokens only when verified + set default buy token (prefer XLM)
  useEffect(() => {
    if (!isVerified) {
      setTokens([]);
      setBuyToken(null);
      return;
    }
    const source = tokensList && tokensList.length ? tokensList : appStore.tokens;
    if (!source || source.length === 0) return;

    setTokens(source);
    if (!buyToken) {
      const xlm = source.find((t) => t.symbol === 'XLM');
      setBuyToken(xlm || source[0]);
    }
  }, [isVerified, tokensList, appStore.tokens, buyToken, verifiedTick]);

  // 11) initialize from query params (wait for tokens)
  useEffect(() => {
    if (!queryParams || tokens.length === 0) return;

    if (queryParams.token) {
      const foundToken = tokens.find(
        (token) => token.symbol.toLowerCase() === queryParams.token?.toLowerCase()
      );
      if (foundToken) setBuyToken(foundToken);
    }
    if (queryParams.amount) setAmount(queryParams.amount);
  }, [queryParams, tokens]);

  // 12) input handlers
  useEffect(() => {
    if (spanRef.current) setInputWidth(spanRef.current.offsetWidth + 8);
  }, [amount]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };
  const handleAmountFocus = () => {
    if (amount === '0') setAmount('');
  };
  const handleAmountBlur = () => {
    if (amount.trim() === '') setAmount('0');
  };
  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  // 13) buy flow + proof gate
  const getButtonLabel = (): string => {
    if (!buyToken) return 'Select a token';
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return 'Enter an amount';
    return 'Buy';
  };

  const handleMainButtonClick = () => {
    const label = getButtonLabel();
    if (label !== 'Buy') return;

    if (!isVerified) {
      ensureOpen('drawer');
      return;
    }

    setReviewOpen(true);
  };

  const connectedAddr = persist.wallet.address;

  return (
    <Stack sx={{ gap: '2px' }}>
      <Stack sx={{ gap: '1px' }}>
        <Stack
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            height: '400px',
            padding: theme.spacing(2),
            alignItems: 'flex-start',
            borderRadius: '20px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: '82px' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              {t("You're buying")}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              position: 'relative',
            }}
          >
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: '64px' }}>
              $
            </Typography>
            <InputBase
              type="number"
              value={amount}
              onChange={handleInputChange}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              onKeyDown={handleAmountKeyDown}
              sx={{
                display: 'inline-flex',
                width: `${inputWidth}px`,
                border: 'none',
                padding: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                '& input': {
                  textAlign: 'center',
                  padding: 0,
                  fontSize: '64px',
                  fontWeight: 400,
                  lineHeight: '48px',
                },
              }}
              inputProps={{ min: 0 }}
            />
            <span
              ref={spanRef}
              style={{
                fontSize: '64px',
                fontWeight: 400,
                lineHeight: '48px',
                letterSpacing: '0px',
                visibility: 'hidden',
                whiteSpace: 'pre',
                position: 'absolute',
              }}
            >
              {amount || '0'}
            </span>
          </Box>

          {buyToken ? (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              mt={1}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <SwapSendPopupButton
                  imgUrl={buyToken.icon}
                  label={buyToken.symbol}
                  onClick={handleOpen}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      height: '100%',
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
                      {buyableAmt.toFixed(6)}{' '}
                      <Box component="span" sx={{ color: theme.palette.text.primary }}>
                        {buyToken?.symbol}
                      </Box>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <SwapSendEmptyPopupButton label="Select token" onClick={handleOpen} />
            </Box>
          )}

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2, justifyContent: 'center', width: '100%' }}
          >
            {QUICK_BUTTONS.map(({ amount: quick }) => (
              <Button
                key={quick}
                variant="outlined"
                onClick={() => setAmount(String(quick))}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.grey[500], 0.08),
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.grey[500], 0.16),
                    border: `1px solid ${theme.palette.divider}`,
                  },
                  gap: 1,
                  borderRadius: '32px',
                  px: '12px',
                  py: '6px',
                  minWidth: 0,
                  fontSize: '12px',
                }}
              >
                ${quick}
              </Button>
            ))}
          </Stack>
        </Stack>

        <Box>
          {isConnected ? (
            <Button
              fullWidth
              variant="soft"
              color="secondary"
              size="large"
              sx={{ borderRadius: 2.5 }}
              onClick={handleMainButtonClick}
              disabled={getButtonLabel() !== 'Buy'}
            >
              {getButtonLabel()}
            </Button>
          ) : (
            <WalletGate buttonText="Connect Wallet to Buy" fullWidth variant="soft">
              {null}
            </WalletGate>
          )}
        </Box>

        <PickToken open={open} onClose={handleClose} tokens={tokens} onTokenSelect={setBuyToken} />

        {reviewOpen && (
          <CheckoutDialog
            open={reviewOpen}
            token={buyToken?.symbol ?? 'USDC'}
            amount={amount}
            onClose={handleReviewClose}
            walletAddress={connectedAddr}
          />
        )}
      </Stack>
    </Stack>
  );
};

export default BuyCard;
