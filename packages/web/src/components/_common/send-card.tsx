import type { CardProps } from '@mui/material';
import type { SendQueryParams } from '@/types/query-params';
import type { StateToken as Token } from '@normalfinance/types';

import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';
import React, { useRef, useState, useEffect } from 'react';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { isValidStellarAddress } from '@/utils/address-validator';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useProofDialogStore } from '@/stores/proof-dialog-store';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { getMaxAmount, convertCoinToFiat, convertFiatToCoin } from '@/utils/conversion-helpers';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, InputBase, Typography } from '@mui/material';

import PickToken from './pick-token';
import SendReview from './send-review';
import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';

interface SendCardProps extends CardProps {
  tokensList?: Token[];
  networkCost?: number;
  queryParams?: SendQueryParams;
}

const DEFAULT_DESTINATION = 'Wallet address';

const SendCard: React.FC<SendCardProps> = ({ tokensList = [], networkCost, queryParams }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const appStore = useAppStore();
  const persist = usePersistStore();
  const { publicKey } = useStellarWalletsKit();
  const connectedAddress = persist.wallet.address || publicKey || null;
  const isVerified = !!connectedAddress && isWalletVerifiedForSession(connectedAddress);
  const isConnected = !!connectedAddress;
  const { ensureOpen } = useProofDialogStore();
  const proofOpenedOnceRef = useRef(false);

  const [tokens, setTokens] = useState<Token[]>([]);
  const [sendToken, setSendToken] = useState<Token | null>(null);

  const [destination, setDestination] = useState<string>(DEFAULT_DESTINATION);
  const [amount, setAmount] = useState<string>('0');
  const [isFiatMode, setIsFiatMode] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [activeButton, setActiveButton] = useState<'send' | ''>('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  const [inputWidth, setInputWidth] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  const [coinValue, setCoinValue] = useState<number>(0);
  const [fiatValue, setFiatValue] = useState<number>(0);

  useEffect(() => {
    if (sendToken) {
      const amt = parseFloat(amount) || 0;
      const coin = isFiatMode ? amt / sendToken.usdValue : amt;
      const fiat = coin * sendToken.usdValue;
      setCoinValue(coin);
      setFiatValue(fiat);
    } else {
      setCoinValue(0);
      setFiatValue(0);
    }
  }, [amount, sendToken, isFiatMode]);

  useEffect(() => {
    if (spanRef.current) setInputWidth(spanRef.current.offsetWidth + 8);
  }, [amount]);

  useEffect(() => {
    if (!connectedAddress) return;
    if (!isVerified && !proofOpenedOnceRef.current) {
      ensureOpen('drawer');
      proofOpenedOnceRef.current = true;
    }
    if (isVerified) {
      proofOpenedOnceRef.current = false;
    }
  }, [connectedAddress, isVerified, ensureOpen]);

  useEffect(() => {
    const onVerified = (e: any) => {
      if (!connectedAddress || e?.detail?.address !== connectedAddress) return;
      appStore
        .getAllTokens()
        .catch((err) => console.error('[SendCard] getAllTokens after verify error:', err));
    };
    window.addEventListener('nf:walletVerified', onVerified);
    return () => window.removeEventListener('nf:walletVerified', onVerified);
  }, [connectedAddress, appStore]);

  useEffect(() => {
    if (!isVerified) {
      setTokens([]);
      setSendToken(null);
      return;
    }
    const source = tokensList && tokensList.length ? tokensList : appStore.tokens;
    if (!source || source.length === 0) return;

    setTokens(source);
    if (!sendToken) {
      const xlm = source.find((tok) => tok.symbol === 'XLM');
      setSendToken(xlm || source[0]);
    }
  }, [isVerified, tokensList, appStore.tokens, sendToken]);

  useEffect(() => {
    if (!queryParams || tokens.length === 0) return;

    if (queryParams.token) {
      const foundToken = tokens.find(
        (tok) => tok.symbol.toLowerCase() === queryParams.token?.toLowerCase()
      );
      if (foundToken) setSendToken(foundToken);
    }
    if (queryParams.amount) setAmount(queryParams.amount);
    if (queryParams.destination) setDestination(queryParams.destination);
  }, [queryParams, tokens]);

  useEffect(() => {
    if (isConnected) return;
    proofOpenedOnceRef.current = false;
    setTokens([]);
    setSendToken(null);
    setAmount('0');
    setIsFiatMode(true);
    setDestination(DEFAULT_DESTINATION);
    setOpen(false);
    setReviewOpen(false);
  }, [isConnected]);

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
  const toggleAmountMode = () => {
    if (sendToken) {
      const amt = parseFloat(amount) || 0;
      if (amt === 0) {
        setAmount('0');
      } else if (isFiatMode) {
        const coinVal = convertFiatToCoin(amt, sendToken.usdValue);
        setAmount(coinVal.toFixed(6));
      } else {
        const fiatVal = convertCoinToFiat(amt, sendToken.usdValue);
        setAmount(fiatVal.toFixed(6));
      }
    }
    setIsFiatMode(!isFiatMode);
  };

  const coinAmount = sendToken
    ? isFiatMode
      ? (parseFloat(amount) || 0) / sendToken.usdValue
      : parseFloat(amount) || 0
    : 0;
  const insufficientBalance = sendToken ? coinAmount > sendToken.balance : false;

  const getButtonLabel = (): string => {
    if (destination === DEFAULT_DESTINATION) return t('Input wallet address');
    if (!sendToken) return t('Select a token');
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return t('Enter an amount');
    if (insufficientBalance) return `${t('Insufficient')} ${sendToken.symbol}`;
    return t('Send');
  };

  const handleMainButtonClick = () => {
    const label = getButtonLabel();
    if (label !== t('Send')) return;

    if (!isVerified) {
      if (!proofOpenedOnceRef.current) {
        ensureOpen('drawer');
        proofOpenedOnceRef.current = true;
      }
      return;
    }

    if (!isValidStellarAddress(destination)) {
      enqueueSnackbar(t('Invalid Stellar address'), { variant: 'error' });
      return;
    }
    if (destination === persist.wallet.address) {
      enqueueSnackbar(t('Cannot send tokens to yourself'), { variant: 'error' });
      return;
    }
    setReviewOpen(true);
  };

  const isSendReady = getButtonLabel() === t('Send');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: 1 }} width={1}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            height: '278px',
            padding: theme.spacing(2),
            alignItems: 'flex-start',
            borderRadius: '20px 20px 0 0',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: '82px' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              {t("You're sending")}
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
            {isFiatMode && (
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: '64px' }}>
                {t('$')}
              </Typography>
            )}
            <InputBase
              type="number"
              value={amount}
              onChange={handleInputChange}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              onKeyDown={handleAmountKeyDown}
              sx={{
                display: 'inline-flex',
                maxWidth: '100%',
                width: `${inputWidth}px`,
                border: 'none',
                padding: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                color: insufficientBalance
                  ? theme.palette.error.main
                  : amount === '0' || amount === ''
                    ? theme.palette.text.secondary
                    : theme.palette.text.primary,
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
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {sendToken && isFiatMode ? (
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                {coinAmount.toFixed(6)} {sendToken.symbol}
              </Typography>
            ) : sendToken ? (
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                {fCurrency(coinAmount * sendToken.usdValue)}
              </Typography>
            ) : null}
            <Iconify
              icon="solar:transfer-horizontal-bold-duotone"
              width={14}
              sx={{ color: theme.palette.text.secondary, cursor: 'pointer', rotate: '-90deg' }}
              onClick={toggleAmountMode}
            />
          </Box>
        </Box>

        <Button
          onClick={() => {
            setActiveButton('send');
            setOpen(true);
          }}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            padding: theme.spacing(2),
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '0 0 20px 20px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box
              component="img"
              src={sendToken ? getCryptoIconUrl(sendToken.symbol) : ''}
              sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: theme.palette.text.primary, textAlign: 'start' }}
              >
                {sendToken?.symbol}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  fontSize: '12px',
                  textAlign: 'start',
                }}
              >
                {t('Balance:')} <Box component="span">{sendToken?.balance}</Box>{' '}
                <Box component="span" sx={{ color: theme.palette.text.secondary }}>
                  {t('(')}
                  {fCurrency(Number(sendToken?.balance ?? 0) * (sendToken?.usdValue ?? 0))}
                  {t(')')}
                </Box>
              </Typography>
            </Box>
          </Box>
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
            <Button
              variant="soft"
              color="secondary"
              size="small"
              sx={{ fontWeight: 500, fontSize: '12px', p: 0, height: '24px', minWidth: '36px' }}
              onClick={(e) => {
                e.stopPropagation();
                if (sendToken) {
                  setAmount(
                    getMaxAmount(Number(sendToken.balance), sendToken.usdValue, isFiatMode)
                  );
                }
              }}
            >
              {t('Max')}
            </Button>
            <Iconify
              width={24}
              icon="eva:arrow-ios-downward-fill"
              sx={{ color: theme.palette.text.primary }}
            />
          </Box>
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          padding: '12px',
          px: '16px',
          justifyContent: 'center',
          alignItems: 'flex-start',
          borderRadius: '20px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          overflow: 'hidden',
        }}
      >
        <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
          {t('To')}
        </Typography>
        <InputBase
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onFocus={() => {
            if (destination === DEFAULT_DESTINATION) setDestination('');
          }}
          onBlur={() => {
            if (destination.trim() === '') setDestination(DEFAULT_DESTINATION);
          }}
          sx={{
            width: '100%',
            border: 'none',
            padding: 0,
            color:
              destination === DEFAULT_DESTINATION
                ? theme.palette.text.secondary
                : theme.palette.text.primary,
          }}
          inputProps={{ style: { fontSize: '14px', fontWeight: 400, lineHeight: '22px' } }}
        />
      </Box>

      <Box>
        {isConnected ? (
          <Button
            fullWidth
            variant="soft"
            color="secondary"
            size="large"
            disabled={!isSendReady}
            onClick={handleMainButtonClick}
            sx={{ borderRadius: 2.5 }}
          >
            {getButtonLabel()}
          </Button>
        ) : (
          <WalletGate
            buttonText="Connect Wallet to Send"
            fullWidth
            variant="soft"
            color="secondary"
            size="large"
            sx={{ borderRadius: 2.5 }}
          />
        )}
      </Box>

      {reviewOpen && (
        <SendReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sendToken={sendToken}
          tokenValue={coinValue}
          fiatValue={fiatValue}
          address={destination}
          networkCost={networkCost ?? 0}
        />
      )}

      <PickToken
        open={open}
        onClose={() => setOpen(false)}
        buttonSource="send"
        tokens={tokens}
        onTokenSelect={(token) => {
          setSendToken(token);
          setOpen(false);
        }}
      />
    </Box>
  );
};

export default SendCard;
