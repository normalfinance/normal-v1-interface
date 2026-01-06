import type { CardProps } from '@mui/material';
import type { Pair, Token } from '@normalfinance/types';

import { useTrustLine } from '@/hooks';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { usePairFactory } from '@/hooks/stellar/use-pair-factory';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import {
  logger,
  constants,
  checkTrustline,
  getCryptoIconUrl,
  sanitizeAmountInput,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, InputBase, Typography } from '@mui/material';

import PickToken from './pick-token';
import { WalletGate } from './wallet-gate';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

enum ButtonState {
  SELECT_TOKEN = 'SELECT_TOKEN',
  ENTER_AMOUNT = 'ENTER_AMOUNT',
  ZERO_BALANCE = 'ZERO_BALANCE',
  CHECKING_TRUSTLINE = 'CHECKING_TRUSTLINE',
  CREATE_TRUSTLINE = 'CREATE_TRUSTLINE',
  CREATING_TRUSTLINE = 'CREATING_TRUSTLINE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
}

interface ButtonConfig {
  label: string;
  disabled: boolean;
  action: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
}

interface MintRedeemCardProps extends CardProps {}

const MintRedeemCard: React.FC<MintRedeemCardProps> = ({ ...other }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const {
    wallet,
    tokenState: { tokens },
    pairState: { pairByToken },
  } = usePersistStore();

  const usdcToken = tokens.find((tkn) => tkn.contract === constants.StellarConfig.USDC_ADDRESS);

  const { publicKey } = useStellarWalletsKit();

  const { addTrustLine } = useTrustLine();

  const { loading, setLoading, mintPair, redeemPair } = usePairFactory();

  const [swapError, setSwapError] = useState<string | null>(null);
  const [creatingTrustline, setCreatingTrustline] = useState<boolean>(false);
  const [needsTrustline, setNeedsTrustline] = useState<boolean>(false);
  const [checkingTrustline, setCheckingTrustline] = useState<boolean>(false);

  const [selectedToken, setSelectedToken] = useState<Token | null>(
    tokens.length ? tokens[0] : null
  );
  const [pair, setPair] = useState<Pair | null>(null);
  const [action, setAction] = useState<'mint' | 'redeem'>('mint');
  const [amount, setAmount] = useState<string>('0');

  // 3) Popup states for picking tokens
  const [open, setOpen] = useState(false);

  const [insufficientBalance, setInsufficientBalance] = useState(false);

  const amountVal = parseFloat(amount) || 0;
  const amountFiatValue =
    usdcToken && amountVal > 0 ? BigNumber(usdcToken.price).multipliedBy(amountVal).toNumber() : 0;

  // 6) Open/close the token picker
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  // Function to check if trustline is needed for the buy token
  const checkTrustlineStatus = useCallback(async () => {
    logger.log('[TRUSTLINE CHECK] Starting check for token:', selectedToken?.symbol);

    if (!selectedToken || selectedToken.symbol === 'XLM') {
      logger.log('[TRUSTLINE CHECK] No check needed - XLM or no token');
      setNeedsTrustline(false);
      return;
    }

    const walletAddress = publicKey || wallet.address;
    if (!walletAddress) {
      logger.log('[TRUSTLINE CHECK] No wallet address available');
      setNeedsTrustline(false);
      return;
    }

    logger.log('[TRUSTLINE CHECK] Checking for wallet:', walletAddress);
    setCheckingTrustline(true);
    try {
      const trustlineStatus = await checkTrustline(
        walletAddress,
        selectedToken.symbol,
        selectedToken.issuer
      );
      logger.log('[TRUSTLINE CHECK] Result:', trustlineStatus);
      setNeedsTrustline(!trustlineStatus.exists);
    } catch (error) {
      logger.error('[TRUSTLINE CHECK] Error checking trustline:', error);
      setNeedsTrustline(false);
    }
    setCheckingTrustline(false);
  }, [selectedToken, publicKey, wallet.address]);

  // Check trustline status when buy token changes
  useEffect(() => {
    checkTrustlineStatus();
  }, [checkTrustlineStatus]);

  // 7) Auto-fetch pair whenever relevant fields change: selectedToken, amount
  useEffect(() => {
    // Clear old state each time
    setLoading(false);
    setInsufficientBalance(false);
    setSwapError(null);
    setCreatingTrustline(false);
    setNeedsTrustline(false);
    setCheckingTrustline(false);
    setPair(null);

    // Make sure we have a token and the store pairs
    if (!selectedToken || !Object.keys(pairByToken).length) {
      return;
    }

    setLoading(true);

    // Load the pair from the
    const pairFromStore = pairByToken[selectedToken.contract];
    setPair(pairFromStore);

    // If no pair exists for the selected token
    if (!pairFromStore) {
      setSwapError('No pair found from store');
      return;
    }

    // If user hasn't typed anything or typed 0
    if (!amount) {
      setSwapError('No amount provided');
      return;
    }

    if (!usdcToken) {
      setSwapError('No USDC token found');
      return;
    }

    setLoading(false);

    if (action === 'mint') {
      // Check USDC balance
      if (BigNumber(usdcToken.balance).lt(amountVal)) {
        setInsufficientBalance(true);
      }
    } else {
      // Check LONG and SHORT balance
      if (
        BigNumber(selectedToken.balance).lt(amountVal) ||
        BigNumber(selectedToken.balance).lt(amountVal)
      ) {
        setInsufficientBalance(true);
      }
    }
  }, [selectedToken, amount, amountVal]);

  // 8) handle input changes, dont allow negative numbers as input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleFocus = () => {
    if (amount === '0') setAmount('');
  };

  const handleBlur = () => {
    if (amount === '') setAmount('0');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  // 9) handle token selection from popup, are we picking a sell token or a buy token?
  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);

    // After adjusting, close the picker
    handleClose();
  };

  const getButtonState = (): ButtonState => {
    logger.log('[BUTTON STATE] State check:', {
      selectedToken: selectedToken?.symbol,
      checkingTrustline,
      creatingTrustline,
      needsTrustline,
      amountVal,
      insufficientBalance,
    });

    if (!selectedToken) {
      return ButtonState.SELECT_TOKEN;
    }
    if (!tokens.some((tkn) => tkn.balance != '0')) {
      return ButtonState.ZERO_BALANCE;
    }
    if (checkingTrustline) {
      return ButtonState.CHECKING_TRUSTLINE;
    }
    if (creatingTrustline) {
      return ButtonState.CREATING_TRUSTLINE;
    }
    // Check trustline first, before amount validation
    if (needsTrustline) {
      logger.log('[BUTTON STATE] Returning CREATE_TRUSTLINE');
      return ButtonState.CREATE_TRUSTLINE;
    }
    if (amountVal <= 0) {
      return ButtonState.ENTER_AMOUNT;
    }

    if (insufficientBalance) {
      return ButtonState.INSUFFICIENT_BALANCE;
    }
    return ButtonState.ENTER_AMOUNT;
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
      [ButtonState.ZERO_BALANCE]: {
        label: 'Fund your account',
        disabled: true,
        action: () => {},
        color: 'error' as const,
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
    };

    return configs[state];
  };

  const handleMainButtonClick = () => {
    const state = getButtonState();
    const config = getButtonConfig(state);
    config.action();
  };

  // Separate function to handle trustline creation
  const handleCreateTrustline = async () => {
    if (!selectedToken || selectedToken.symbol === 'XLM') return;

    setCreatingTrustline(true);
    setSwapError(null);

    try {
      await addTrustLine(selectedToken.symbol, selectedToken.issuer);
      // After successful trustline creation, check status again
      await checkTrustlineStatus();
    } catch (error) {
      setSwapError('Failed to enable asset');
      logger.error('Enable asset error:', error);
    } finally {
      setCreatingTrustline(false);
    }
  };

  // Max the sell token
  const handleMaxClick = () => {
    if (selectedToken) {
      setAmount(selectedToken.balance.toString());
    }
  };

  /**
   * Executes the mint or redeem transaction.
   * This function signs and sends the transaction using WalletConnect or Signer.
   *
   * @async
   */
  const checkIfTradeAllowed = async () => {
    setSwapError(null);
    if (!selectedToken || !pair) return false;
    return true;
  };

  // New: doSwap function for use in onSubmit (simplified - no trustline creation)
  const settleTrade = async (): Promise<void> => {
    if (selectedToken && pair) {
      try {
        const allowed = await checkIfTradeAllowed();
        if (!allowed) {
          return;
        }

        // Check if trustline exists for the token (if it's not XLM)
        if (selectedToken.symbol !== 'XLM') {
          const walletAddress = publicKey || wallet.address;
          if (!walletAddress) {
            setSwapError('No account connected');
            return;
          }

          const trustlineStatus = await checkTrustline(
            walletAddress,
            selectedToken.symbol,
            selectedToken.issuer
          );

          if (!trustlineStatus.exists) {
            setSwapError('Please enable this asset before investing');
            return;
          }
        }

        // Now call the client-side mintPair or redeempair (sign and submit)
        if (action === 'mint') {
          await mintPair({
            asset: '', // TODO:
            tokens_to_mint: Number(amount),
          });
        } else {
          await redeemPair({
            asset: '', // TODO:
            tokens_to_redeem: Number(amount),
          });
        }
      } catch (error) {
        setSwapError('Error during mint/redeem');
      }
    }
  };

  // Main button with multiple states
  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Token Section */}
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
              <Typography variant="body1" noWrap data-testid="sell-token-picker">
                {t('Trade')}
              </Typography>
              <InputBase
                type="number"
                value={amount}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
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
                    : amount === '0' || amount === ''
                      ? theme.palette.text.secondary
                      : theme.palette.text.primary,
                  flexGrow: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  whiteSpace: 'nowrap',
                }}
              />
              <Typography
                noWrap
                sx={{
                  fontSize: 'var(--components-nav-item-size, 14px)',
                  fontStyle: 'normal',
                  fontWeight: 'var(--components-nav-item-weight, 500)',
                  lineHeight: 'var(--components-nav-item-line-height, 22px)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  minWidth: 0,
                }}
              >
                {`${fCurrency(amountFiatValue)}`}
              </Typography>
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
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
              >
                <SwapSendPopupButton
                  imgUrl={selectedToken.icon ?? getCryptoIconUrl(selectedToken.symbol)}
                  label={selectedToken.symbol}
                  onClick={() => {
                    handleOpen();
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
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
                        color: insufficientBalance
                          ? theme.palette.error.main
                          : theme.palette.text.secondary,
                        fontSize: '12px',
                      }}
                    >
                      {BigNumber(selectedToken.balance).toFixed(selectedToken.decimals)}{' '}
                      <Box
                        component="span"
                        sx={{
                          color: insufficientBalance
                            ? theme.palette.error.main
                            : theme.palette.text.primary,
                        }}
                      >
                        {selectedToken?.symbol}
                      </Box>
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleMaxClick}
                    disabled={loading}
                    sx={{
                      fontWeight: 500,
                      fontSize: '12px',
                      p: 0,
                      height: '24px',
                      minWidth: '36px',
                      backgroundColor: 'rgba(148,123,255,0.29)',
                      color: '#6E4BFF',
                      '&:hover': {
                        backgroundColor: 'rgba(148,123,255,0.20)',
                      },
                    }}
                  >
                    {t('Max')}
                  </Button>
                </Box>
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

      {/* Display swap error if exists */}
      {swapError && (
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
            {swapError}
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
        <WalletGate buttonText="Login to invest" fullWidth>
          {null}
        </WalletGate>
      )}

      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={handleClose}
        tokens={tokens}
        onTokenSelect={handleTokenSelect}
      />
    </Box>
  );
};

export default MintRedeemCard;
