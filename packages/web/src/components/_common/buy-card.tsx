import type { CardProps } from '@mui/material';
import type { BuyQueryParams } from '@/types/query-params';
import type { StateToken as Token } from '@normalfinance/types';

import Image from 'next/image';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { runDepositFlow } from '@/lib/mgi/client';
import { usePersistStore } from '@normalfinance/state';
import React, { useRef, useState, useEffect } from 'react';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { convertFiatToCoin } from '@/utils/conversion-helpers';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Button, InputBase, Typography } from '@mui/material';

import PickToken from './pick-token';
import { WalletGate } from './wallet-gate';
import CheckoutDialog from './checkout-dialog';
import AmountDialog from '../deposit-amount-dialog';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

interface BuyCardProps extends CardProps {
  tokensList?: Token[];
  cashBalance?: number;
  queryParams?: BuyQueryParams;
}

export interface QuickAmountButton {
  amount: number;
}

const QUICK_BUTTONS: QuickAmountButton[] = [
  {
    amount: 100,
  },
  {
    amount: 300,
  },
  {
    amount: 1000,
  },
];

const BuyCard: React.FC<BuyCardProps> = ({
  tokensList = [],
  cashBalance,
  queryParams,
  ...other
}) => {
  const theme = useTheme();
  const { t } = useTranslate();

  // State declarations...
  const [buyToken, setBuyToken] = useState<Token | null>(tokensList.length ? tokensList[0] : null);
  const [amount, setAmount] = useState<string>('0');
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    // trackEvent('button_clicked', {
    //   label: 'Close Buy Card',
    //   location: 'Insurance',
    // });
    setOpen(false);
  };

  // For dynamic width measurement
  const [inputWidth, setInputWidth] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  const fiatValue = parseFloat(amount) || 0;
  const buyableAmt =
    buyToken && fiatValue > 0 ? convertFiatToCoin(fiatValue, buyToken.usdValue) : 0;

  // State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  useEffect(() => {
    if (queryParams) {
      if (queryParams.token) {
        const foundToken = tokensList.find(
          (token) => token.symbol.toLowerCase() === queryParams.token?.toLowerCase()
        );
        if (foundToken) {
          setBuyToken(foundToken);
        }
      }

      if (queryParams.amount) {
        setAmount(queryParams.amount);
      }
    }
  }, [queryParams, tokensList]);

  useEffect(() => {
    if (spanRef.current) {
      // Increase the extra space to account for kerning issues with characters like "."
      setInputWidth(spanRef.current.offsetWidth + 8);
    }
  }, [amount]);

  //prevent "-" ot "," in input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });
    setAmount(sanitizeAmountInput(e.target.value));
  };

  // Toggle mode, handle focus/blur, etc...
  const handleAmountFocus = () => {
    if (amount === '0') {
      setAmount('');
    }
  };

  const handleAmountBlur = () => {
    if (amount.trim() === '') {
      setAmount('0');
    }
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  const getButtonLabel = (): string => {
    if (!buyToken) {
      return 'Select a token';
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      return 'Enter an amount';
    }

    return 'Buy';
  };

  const handleMainButtonClick = () => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });

    const label = getButtonLabel();

    if (label !== 'Buy') {
      return;
    }

    setReviewOpen(true);
  };

  const handleTokenSelect = (token: Token) => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });
    setBuyToken(token);
  };

  // Main button with multiple states
  const { enqueueSnackbar } = useSnackbar();
  const persist = usePersistStore();
  const userAddress = persist.wallet.address;
  const isConnected = !!userAddress;

  const [mgiLoading, setMgiLoading] = useState(false);

  // NEW: control the amount popup
  const [amountDialogOpen, setAmountDialogOpen] = useState(false);

  const ensureUSDCSelected = () => {
    if (buyToken?.symbol?.toUpperCase() !== 'USDC') {
      const usdc = tokensList.find((token) => token.symbol.toUpperCase() === 'USDC');
      if (usdc) setBuyToken(usdc);
    }
  };
  // UPDATED: on click, open amount dialog (don’t start flow yet)
  const handleBuyWithMoneyGram = async () => {
    if (!isConnected) {
      enqueueSnackbar('Connect your wallet to continue', { variant: 'warning' });
      return;
    }
    setAmountDialogOpen(true);
  };

  // NEW: called when user submits amount in the dialog
  const startMgiAfterAmount = async (usdcAmount: string) => {
    try {
      setMgiLoading(true);

      // Optional – sanity preflight (gives user actionable errors)
      const env = await detectWalletEnv();
      assertTestnetAndAccountMatch(env, userAddress!);

      ensureUSDCSelected();

      await runDepositFlow(userAddress!, usdcAmount, () => {
        enqueueSnackbar('MoneyGram ready — awaiting USDC deposit', { variant: 'info' });
      });
    } catch (e: any) {
      enqueueSnackbar(e?.message || 'MoneyGram deposit failed', { variant: 'error' });
    } finally {
      setMgiLoading(false);
    }
  };

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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            width={1}
            mb="48px"
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                {t("You're buying")}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={handleBuyWithMoneyGram}
              disabled={!isConnected || mgiLoading}
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
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Image
                src="/assets/images/token-action-card/mgi.webp"
                alt="MoneyGram"
                width={20}
                height={20}
              />
              {mgiLoading ? 'Opening…' : 'Buy USDC with MoneyGram'}
            </Button>
          </Stack>
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
              inputProps={{
                min: 0,
              }}
            />
            {/* Hidden span used for measuring text width */}
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
                  onClick={() => {
                    handleOpen();
                  }}
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
                      <Box
                        component="span"
                        sx={{
                          color: theme.palette.text.primary,
                        }}
                      >
                        {buyToken?.symbol}
                      </Box>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <SwapSendEmptyPopupButton
                label="Select token"
                onClick={() => {
                  handleOpen();
                }}
              />
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
                  minWidth: 0, // keep pill-shaped
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
        <PickToken
          open={open}
          onClose={handleClose}
          tokens={tokensList}
          onTokenSelect={handleTokenSelect}
        />

        {reviewOpen && (
          <CheckoutDialog
            open={reviewOpen}
            token={buyToken?.symbol ?? 'USDC'}
            amount={amount}
            onClose={handleReviewClose}
            walletAddress={userAddress || ''}
          />
        )}

        <AmountDialog
          open={amountDialogOpen}
          onCancel={() => setAmountDialogOpen(false)}
          onConfirm={(val) => {
            setAmountDialogOpen(false);
            startMgiAfterAmount(val);
          }}
          min={1}
          max={900}
        />
      </Stack>
    </Stack>
  );
};

export default BuyCard;
