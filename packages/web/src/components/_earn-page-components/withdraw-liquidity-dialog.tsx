'use client';

import type { Token } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { useTrustLine, useManageLiquidity } from '@/hooks';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import {
  constants,
  checkTrustline,
  getCryptoIconUrl,
  sanitizeAmountInput,
} from '@normalfinance/utils';

import {
  Box,
  Alert,
  alpha,
  Dialog,
  Button,
  useTheme,
  InputBase,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
} from '@mui/material';

import { Iconify } from '../template/iconify';
import PickToken from '../_common/pick-token';
import WalletGate from '../_common/wallet-gate';
import InfoAccordion from '../_common/info-accordion';
import SwapSendPopupButton from '../_common/swap-send-popup-button';
import SwapSendEmptyPopupButton from '../_common/swap-send-empty-popup-button';

import type { InfoAccordionRow, InfoAccordionAlert } from '../_common/info-accordion';

// ----------------------------------------------------------------------

enum ButtonState {
  SELECT_TOKEN = 'SELECT_TOKEN',
  ENTER_AMOUNT = 'ENTER_AMOUNT',
  CHECKING_TRUSTLINE = 'CHECKING_TRUSTLINE',
  CREATE_TRUSTLINE = 'CREATE_TRUSTLINE',
  CREATING_TRUSTLINE = 'CREATING_TRUSTLINE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WITHDRAW = 'WITHDRAW',
}

interface ButtonConfig {
  label: string;
  disabled: boolean;
  action: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
}

type TrustlineState = {
  creating: boolean;
  needs: boolean;
  checking: boolean;
};
export interface WithdrawLiquidityDialog {
  open: boolean;
  onClose: () => void;
}

// ----------------------------------------------------------------------

export default function WithdrawLiquidityDialog({ open, onClose }: WithdrawLiquidityDialog) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const {
    wallet,
    tokenState: { tokensByAddress },
    pairState: { pairByToken },
  } = usePersistStore();

  const { loading, setLoading, liquidityPositions, withdraw } = useManageLiquidity();
  const { publicKey } = useStellarWalletsKit();
  const { addTrustLine } = useTrustLine();

  // Filter tokens using active liquidity positions
  const filteredTokens =
    liquidityPositions && liquidityPositions.map((pos) => tokensByAddress[pos.pair.tokens.long]);

  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [shareAmount, setShareAmount] = useState('0');
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Trustline state
  const [trustlineState, setTrustlineState] = useState<{
    long: TrustlineState;
    short: TrustlineState;
    usdc: TrustlineState;
  }>({
    long: {
      creating: false,
      needs: false,
      checking: false,
    },
    short: {
      creating: false,
      needs: false,
      checking: false,
    },
    usdc: {
      creating: false,
      needs: false,
      checking: false,
    },
  });

  // 3) Popup states for picking tokens
  const [pickTokenOpen, setPickTokenOpen] = useState(false);

  const shareAmountVal = parseFloat(shareAmount) || 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShareAmount(sanitizeAmountInput(e.target.value));
  };

  const handleFocus = () => {
    if (shareAmount === '0') setShareAmount('');
  };

  const handleBlur = () => {
    if (shareAmount === '') setShareAmount('0');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  // 6) Open/close the token picker
  const handleOpen = () => {
    setPickTokenOpen(true);
  };
  const handleClose = () => {
    setPickTokenOpen(false);
  };

  // 9) handle token selection from popup, are we picking a sell token or a buy token?
  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);

    // After adjusting, close the picker
    handleClose();
  };

  // Separate function to handle trustline creation
  const handleCreateTrustline = async () => {
    if (!selectedToken) return;

    setTrustlineState((prev) => ({
      ...prev,
      long: {
        ...prev.long,
        creating: trustlineState.long.needs,
      },
      short: {
        ...prev.short,
        creating: trustlineState.short.needs,
      },
      usdc: {
        ...prev.usdc,
        creating: trustlineState.usdc.needs,
      },
    }));
    setWithdrawError(null);

    try {
      if (trustlineState.usdc.needs) {
        await addTrustLine('USDC', constants.StellarConfig.USDC_ISSUER);
      }
      if (trustlineState.long.needs) {
        await addTrustLine(selectedToken.symbol, constants.StellarConfig.NORMAL_ISSUER);
      }
      if (trustlineState.short.needs) {
        await addTrustLine(`${selectedToken.symbol}SHORT`, constants.StellarConfig.NORMAL_ISSUER);
      }

      // After successful trustline creation, check status again
      await checkTrustlineStatus();
    } catch (error) {
      setWithdrawError('Failed to enable asset(s)');
    } finally {
      setTrustlineState((prev) => ({
        ...prev,
        long: {
          ...prev.long,
          creating: false,
        },
        short: {
          ...prev.short,
          creating: false,
        },
        usdc: {
          ...prev.usdc,
          creating: false,
        },
      }));
    }
  };

  // Function to check if trustline is needed for the token, it's short, and USDC
  const checkTrustlineStatus = useCallback(async () => {
    if (!selectedToken) {
      setTrustlineState((prev) => ({
        ...prev,
        long: {
          ...prev.long,
          needs: false,
        },
        short: {
          ...prev.short,
          needs: false,
        },
        usdc: {
          ...prev.usdc,
          needs: false,
        },
      }));
      return;
    }

    const walletAddress = publicKey || wallet.address;
    if (!walletAddress) {
      setTrustlineState((prev) => ({
        ...prev,
        long: {
          ...prev.long,
          needs: false,
        },
        short: {
          ...prev.short,
          needs: false,
        },
        usdc: {
          ...prev.usdc,
          needs: false,
        },
      }));
      return;
    }

    // setCheckingTrustline(true);
    setTrustlineState((prev) => ({
      ...prev,
      long: {
        ...prev.long,
        checking: true,
      },
      short: {
        ...prev.short,
        checking: true,
      },
      usdc: {
        ...prev.usdc,
        checking: true,
      },
    }));
    try {
      const longTrustlineStatus = await checkTrustline(
        walletAddress,
        selectedToken.symbol,
        constants.StellarConfig.NORMAL_ISSUER
      );
      const shortTrustlineStatus = await checkTrustline(
        walletAddress,
        `${selectedToken.symbol}SHORT`,
        constants.StellarConfig.NORMAL_ISSUER
      );
      const usdcTrustlineStatus = await checkTrustline(
        walletAddress,
        'USDC',
        constants.StellarConfig.USDC_ISSUER
      );
      setTrustlineState((prev) => ({
        ...prev,
        long: {
          ...prev.long,
          needs: !longTrustlineStatus.exists,
        },
        short: {
          ...prev.short,
          needs: !shortTrustlineStatus.exists,
        },
        usdc: {
          ...prev.usdc,
          needs: !usdcTrustlineStatus.exists,
        },
      }));
    } catch (error) {
      setTrustlineState((prev) => ({
        ...prev,
        long: {
          ...prev.long,
          needs: true,
        },
        short: {
          ...prev.short,
          needs: true,
        },
        usdc: {
          ...prev.usdc,
          needs: true,
        },
      }));
    }
    setTrustlineState((prev) => ({
      ...prev,
      long: {
        ...prev.long,
        checking: false,
      },
      short: {
        ...prev.short,
        checking: false,
      },
      usdc: {
        ...prev.usdc,
        checking: false,
      },
    }));
  }, [selectedToken, publicKey, wallet.address]);

  // Check all trustline statuses when token changes
  useEffect(() => {
    checkTrustlineStatus();
  }, [checkTrustlineStatus]);

  // Function to check if the user's balance is sufficient for the token
  const checkInsufficientBalance = useCallback(async () => {
    if (!selectedToken || !liquidityPositions) {
      setInsufficientBalance(false);
      return;
    }

    const walletAddress = publicKey || wallet.address;
    if (!walletAddress) {
      setInsufficientBalance(false);
      return;
    }

    try {
      const selectedLiquidityPosition = liquidityPositions.find(
        (pos) => pos.pair.tokens.long === selectedToken.contract
      );

      if (!selectedLiquidityPosition) return;

      const sufficientShares = BigNumber(selectedLiquidityPosition.userShares).gte(shareAmountVal);

      setInsufficientBalance(sufficientShares);
    } catch (error) {
      setInsufficientBalance(false);
    }
  }, [selectedToken, liquidityPositions, publicKey, wallet.address]);

  // Check insufficient balances when token changes
  useEffect(() => {
    checkInsufficientBalance();
  }, [checkInsufficientBalance]);

  const getButtonState = (): ButtonState => {
    if (!selectedToken) {
      return ButtonState.SELECT_TOKEN;
    }

    // Check trustline first, before amount validation
    if (
      trustlineState.long.checking ||
      trustlineState.short.checking ||
      trustlineState.usdc.checking
    ) {
      return ButtonState.CHECKING_TRUSTLINE;
    }
    if (
      trustlineState.long.creating ||
      trustlineState.short.creating ||
      trustlineState.usdc.creating
    ) {
      return ButtonState.CREATING_TRUSTLINE;
    }
    if (trustlineState.long.needs || trustlineState.short.needs || trustlineState.usdc.needs) {
      return ButtonState.CREATE_TRUSTLINE;
    }

    // Amount and balance validation
    if (shareAmountVal <= 0) {
      return ButtonState.ENTER_AMOUNT;
    }
    if (insufficientBalance) {
      return ButtonState.INSUFFICIENT_BALANCE;
    }
    return ButtonState.WITHDRAW;
  };

  const getButtonConfig = (state: ButtonState): ButtonConfig => {
    const configs: Record<ButtonState, ButtonConfig> = {
      [ButtonState.SELECT_TOKEN]: {
        label: 'Select an asset',
        disabled: true,
        action: () => {},
      },
      [ButtonState.ENTER_AMOUNT]: {
        label: 'Enter an amount',
        disabled: true,
        action: () => {},
      },
      [ButtonState.CHECKING_TRUSTLINE]: {
        label: 'Checking asset...',
        disabled: true,
        action: () => {},
      },
      [ButtonState.CREATING_TRUSTLINE]: {
        label: 'Enabling asset...',
        disabled: true,
        action: () => {},
      },
      [ButtonState.INSUFFICIENT_BALANCE]: {
        label: 'Insufficient balance',
        disabled: true,
        action: () => {},
        color: 'error' as const,
      },
      [ButtonState.CREATE_TRUSTLINE]: {
        label: 'Enable asset',
        disabled: false,
        action: handleCreateTrustline,
        variant: 'contained' as const,
      },
      [ButtonState.WITHDRAW]: {
        label: 'Withdraw',
        disabled: false,
        action: () => handleWithdraw,
        variant: 'contained' as const,
      },
    };

    return configs[state];
  };

  const handleMainButtonClick = () => {
    const state = getButtonState();
    const config = getButtonConfig(state);
    config.action();
  };

  const handleWithdraw = async (): Promise<void> => {
    if (selectedToken && shareAmount) {
      try {
        // const allowed = await checkIfTradeAllowed();
        // if (!allowed) {
        //   return;
        // }

        // Now call the client-side deposit (sign and submit)
        const selectedPair = pairByToken[selectedToken.contract];

        await withdraw(selectedPair.pairAddress, Number(shareAmount));
      } catch (error) {
        setWithdrawError('Error during withdraw');
      }
    }
  };

  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;

  // // Max the LP token
  // const handleMaxClick = () => {
  //   if (position) {
  //     setValue(
  //       'shareAmount',
  //       position.balances.tokenShare.eq(0)
  //         ? undefined
  //         : Number(position.balances.tokenShare.toString()),
  //       {
  //         shouldValidate: true,
  //       }
  //     );
  //   }
  // };

  const getInfoAccordionAlerts = useCallback((): InfoAccordionAlert[] => {
    const alerts: InfoAccordionAlert[] = [];

    if (insufficientBalance) {
      alerts.push({
        title: `Not enough LP shares to withdraw`,
        icon: 'solar:danger-triangle-bold',
      });
    }

    return alerts;
  }, [insufficientBalance]);

  const getInfoAccordionRows = useCallback((): InfoAccordionRow[] => {
    const rows: InfoAccordionRow[] = [];

    if (shareAmount) {
      rows.push({
        title: `Expected LONG to receive`,
        value: shareAmount,
      });
      rows.push({
        title: `Expected SHORT to receive`,
        value: shareAmount,
      });
      rows.push({
        title: `Expected USDC to receive`,
        value: shareAmount,
      });
    }

    return rows;
  }, [shareAmount]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '400px',
            maxHeight: 'auto',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            {t('Withdraw from Earn Account')}
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 2,
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '2px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: '20px',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
        }}
      >
        <Alert severity="warning" sx={{ mb: 1 }}>
          {t(
            'This will withdraw funds from your Earn balance back to your account, plus any accrued interest.'
          )}
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 2,
                height: '160px',
                padding: theme.spacing(2),
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderRadius: '20px',
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexGrow: 1,
                  minWidth: 0,
                  alignItems: 'flex-start',
                  overflow: 'hidden',
                  textAlign: 'left',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    flexGrow: 1,
                    minWidth: 0,
                  }}
                >
                  <InputBase
                    type="number"
                    value={shareAmount}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    // disabled={getButtonState() == ButtonState.CREATE_TRUSTLINE}
                    inputProps={{
                      min: 0,
                      style: {
                        fontSize: 'var(--h3-size, 32px)',
                        fontStyle: 'normal',
                        fontWeight: 'var(--h3-weight, 700)',
                        lineHeight: 'var(--h3-line-height, 48px)',
                        letterSpacing: 'var(--h3-letter-spacing, 0px)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'clip',
                      },
                    }}
                    sx={{
                      width: '100%',
                      border: 'none',
                      padding: 0,
                      color: insufficientBalance
                        ? theme.palette.error.main
                        : shareAmount === '0' || shareAmount === ''
                          ? theme.palette.text.secondary
                          : theme.palette.text.primary,
                      flexGrow: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'clip',
                      whiteSpace: 'nowrap',
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  height: '128px',
                  overflow: 'hidden',
                }}
              >
                {selectedToken ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 1,
                    }}
                  >
                    <SwapSendPopupButton
                      imgUrl={selectedToken.icon ?? getCryptoIconUrl(selectedToken.symbol)}
                      label={selectedToken.symbol}
                      onClick={() => {
                        handleOpen();
                      }}
                    />
                  </Box>
                ) : (
                  <SwapSendEmptyPopupButton
                    label="Select asset"
                    onClick={() => {
                      handleOpen();
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Additional box with info */}
          {!loading && (
            <InfoAccordion alerts={getInfoAccordionAlerts()} rows={getInfoAccordionRows()} />
          )}

          {/* Token Picker Popup */}
          <PickToken
            open={pickTokenOpen}
            onClose={handleClose}
            tokens={filteredTokens}
            onTokenSelect={handleTokenSelect}
          />
        </Box>

        {/* Display deposit error if exists */}
        {withdrawError && (
          <Box
            sx={{
              padding: theme.spacing(1.5),
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              borderRadius: '12px',
              mt: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.error.main,
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {withdrawError}
            </Typography>
          </Box>
        )}

        {isConnected ? (
          (() => {
            const buttonState = getButtonState();
            const buttonConfig = getButtonConfig(buttonState);

            return (
              <Button
                fullWidth
                variant={buttonConfig.variant || 'contained'}
                size="large"
                onClick={handleMainButtonClick}
                disabled={buttonConfig.disabled}
                color={buttonConfig.color}
                sx={{
                  backgroundColor:
                    buttonConfig.color === 'error' ? undefined : 'rgba(148,123,255,0.29)',
                  color: buttonConfig.color === 'error' ? undefined : '#6E4BFF',
                  '&:hover': {
                    backgroundColor:
                      buttonConfig.color === 'error' ? undefined : 'rgba(148,123,255,0.20)',
                  },
                  borderRadius: '20px',
                  mt: 2,
                }}
              >
                {buttonConfig.label}
              </Button>
            );
          })()
        ) : (
          <WalletGate buttonText="Login to manage your Earn account" fullWidth>
            {null}
          </WalletGate>
        )}
      </DialogContent>
    </Dialog>
  );
}
