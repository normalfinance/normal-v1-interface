import type { CardProps } from '@mui/material';
import type { Pair, Token, ButtonConfig, TrustlineState } from '@normalfinance/types';

import { useTrustLine } from '@/hooks';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { usePairFactory } from '@/hooks/stellar/use-pair-factory';
import { TokenAmountButtonState as ButtonState } from '@normalfinance/types';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import {
  constants,
  isLongToken,
  checkTrustline,
  getCryptoIconUrl,
  sanitizeAmountInput,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, Switch, InputBase, Typography, InputAdornment } from '@mui/material';

import PickToken from './pick-token';
import { WalletGate } from './wallet-gate';
import InfoAccordion from './info-accordion';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';

import type { InfoAccordionAlert } from './info-accordion';

type MintRedeemCardTrustlineState = {
  long: TrustlineState;
  short: TrustlineState;
  usdc: TrustlineState;
};

const initialTrustlineState: MintRedeemCardTrustlineState = {
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
};

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

  const [mintRedeemError, setMintRedeemError] = useState<string | null>(null);

  const [trustlineState, setTrustlineState] =
    useState<MintRedeemCardTrustlineState>(initialTrustlineState);

  const filteredTokens = tokens.filter((tkn) => isLongToken(tkn));
  const [selectedToken, setSelectedToken] = useState<Token | null>(
    filteredTokens.length ? filteredTokens[0] : null
  );
  const [pair, setPair] = useState<Pair | null>(null);
  const [action, setAction] = useState<'mint' | 'redeem'>('mint');
  const [fiatAmount, setAmount] = useState<string>('0');

  // 3) Popup states for picking tokens
  const [open, setOpen] = useState(false);

  const [insufficientBalance, setInsufficientBalance] = useState(false);

  const fiatAmountVal = parseFloat(fiatAmount) || 0;
  const amountFiatValue =
    usdcToken && fiatAmountVal > 0
      ? BigNumber(usdcToken.price).multipliedBy(fiatAmountVal).toNumber()
      : 0;

  const collateralRequiredFiatValue =
    usdcToken && pair && fiatAmountVal > 0
      ? BigNumber(usdcToken.price)
          .multipliedBy(fiatAmountVal)
          .multipliedBy(pair.collateral.collateralPerPair)
          .toNumber()
      : 0;

  // 6) Open/close the token picker
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
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
        `s${selectedToken.symbol}`,
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

  // 7) Auto-fetch pair whenever relevant fields change: selectedToken, amount
  useEffect(() => {
    // Clear old state each time
    setLoading(false);
    setInsufficientBalance(false);
    setMintRedeemError(null);
    setTrustlineState(initialTrustlineState);

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
      // setMintRedeemError('No pair found from store');
      return;
    }

    // If user hasn't typed anything or typed 0
    if (!fiatAmount) {
      // setMintRedeemError('No amount provided');
      return;
    }

    if (!usdcToken) {
      // setMintRedeemError('No USDC token found');
      return;
    }

    setLoading(false);

    if (action === 'mint') {
      // Check USDC balance
      const collateralRequired = BigNumber(pairFromStore.collateral.collateralPerPair).multipliedBy(
        fiatAmountVal
      );

      if (BigNumber(usdcToken.balance).lt(collateralRequired)) {
        setInsufficientBalance(true);
      }
    } else {
      // Check LONG and SHORT balance
      if (
        BigNumber(selectedToken.balance).lt(fiatAmountVal) ||
        BigNumber(selectedToken.balance).lt(fiatAmountVal)
      ) {
        setInsufficientBalance(true);
      }
    }
  }, [selectedToken, fiatAmount, fiatAmountVal]);

  // 8) handle input changes, dont allow negative numbers as input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeAmountInput(e.target.value));
  };

  const handleFocus = () => {
    if (fiatAmount === '0') setAmount('');
  };

  const handleBlur = () => {
    if (fiatAmount === '') setAmount('0');
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
    if (!selectedToken) {
      return ButtonState.SELECT_TOKEN;
    }
    if (!tokens.some((tkn) => tkn.balance != '0')) {
      return ButtonState.ZERO_BALANCE;
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

    if (fiatAmountVal <= 0) {
      return ButtonState.ENTER_AMOUNT;
    }
    if (insufficientBalance) {
      return ButtonState.INSUFFICIENT_BALANCE;
    }
    return ButtonState.SUBMIT;
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
      [ButtonState.SUBMIT]: {
        label: action === 'mint' ? 'Mint' : 'Redeem',
        disabled: false,
        action: handleSubmit,
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
    setMintRedeemError(null);

    try {
      if (trustlineState.usdc.needs) {
        await addTrustLine('USDC', constants.StellarConfig.USDC_ISSUER);
      }
      if (trustlineState.long.needs) {
        await addTrustLine(selectedToken.symbol, constants.StellarConfig.NORMAL_ISSUER);
      }
      if (trustlineState.short.needs) {
        await addTrustLine(`s${selectedToken.symbol}`, constants.StellarConfig.NORMAL_ISSUER);
      }

      // After successful trustline creation, check status again
      await checkTrustlineStatus();
    } catch (error) {
      setMintRedeemError('Failed to enable asset(s)');
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
    setMintRedeemError(null);
    if (!selectedToken || !pair) return false;
    return true;
  };

  // New: mintPair/redeemPair function for use in onSubmit (simplified - no trustline creation)
  const handleSubmit = async (): Promise<void> => {
    if (selectedToken && pair) {
      try {
        const allowed = await checkIfTradeAllowed();
        if (!allowed) {
          return;
        }

        // Now call the client-side mintPair or redeempair (sign and submit)
        const pairTokenAmount = BigNumber(fiatAmount).dividedBy(pair.collateral.collateralPerPair);

        if (action === 'mint') {
          await mintPair({
            asset: pair.asset,
            tokens_to_mint: Number(pairTokenAmount),
          });
        } else {
          await redeemPair({
            asset: pair.asset,
            tokens_to_redeem: Number(pairTokenAmount),
          });
        }
      } catch (error) {
        setMintRedeemError('Error during mint/redeem');
      }
    }
  };

  // Main button with multiple states
  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;

  const getInfoAccordionAlerts = useCallback((): InfoAccordionAlert[] => {
    const alerts: InfoAccordionAlert[] = [];

    if (insufficientBalance) {
      alerts.push({
        title: `Not enough ${action === 'mint' ? 'USD' : 'token pair(s)'} to ${action}`,
        icon: 'solar:danger-triangle-bold',
      });
    }

    return alerts;
  }, [insufficientBalance, action]);

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
                {t('Redeem')}
                <Switch
                  checked={action === 'mint'}
                  color="info"
                  onClick={() => {
                    setAction(action === 'mint' ? 'redeem' : 'mint');
                  }}
                />
                {t('Mint')}
              </Typography>
              <InputBase
                type="number"
                value={fiatAmount}
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
                startAdornment={
                  <InputAdornment position="start">
                    <Typography
                      sx={{
                        fontSize: 'var(--h3-size, 32px)',
                        fontWeight: 'var(--h3-weight, 700)',
                        color:
                          fiatAmount === '0' || fiatAmount === ''
                            ? theme.palette.text.secondary
                            : theme.palette.text.primary,
                      }}
                    >
                      $
                    </Typography>
                  </InputAdornment>
                }
                sx={{
                  width: '100%',
                  border: 'none',
                  padding: 0,
                  color: insufficientBalance
                    ? theme.palette.error.main
                    : fiatAmount === '0' || fiatAmount === ''
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
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
              >
                <SwapSendPopupButton
                  imgUrl={selectedToken.icon ?? getCryptoIconUrl(selectedToken.symbol)}
                  label={selectedToken.symbol}
                  onClick={() => {
                    handleOpen();
                  }}
                />
                {action === 'redeem' && (
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
                )}
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
      {mintRedeemError && (
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
            {mintRedeemError}
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
        <WalletGate buttonText="Login to mint/redeem" fullWidth>
          {null}
        </WalletGate>
      )}

      {/* Additional box with info */}
      {!loading && pair && (
        <InfoAccordion
          highlights={[
            action === 'mint'
              ? `This will mint ${BigNumber(fiatAmount).dividedBy(pair.collateral.collateralPerPair)} long and short tokens`
              : `This will require`,
          ]}
          alerts={getInfoAccordionAlerts()}
          rows={[
            {
              title: 'Collateral per Pair',
              value: fCurrency(pair.collateral.collateralPerPair),
            },
          ]}
        />
      )}

      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={handleClose}
        tokens={filteredTokens}
        onTokenSelect={handleTokenSelect}
      />
    </Box>
  );
};

export default MintRedeemCard;
