import type { Token } from '@/types/token';
import type { CardProps } from '@mui/material';

import { fCurrency } from '@/utils/format-number';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { getConversionText } from '@/utils/conversion-helpers';
import React, { useState, useEffect, useCallback } from 'react';
import { NormalPoolRouterContract } from '@normalfinance/contracts';
import { useContractTransaction } from '@/hooks/use-contract-transaction';
import { constants, checkTrustline, fetchAndIssueTrustline } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, InputBase, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import PickToken from './pick-token';
import SwapReview from './swap-review';
import FeeInfoAccordion from './fee-info-accordion';
import SwapSendPopupButton from './swap-send-popup-button';
import SwapSendEmptyPopupButton from './swap-send-empty-popup-button';
import { SwapFeeInfo } from '@/types/swap-fee-info';

interface SwapCardProps extends CardProps {
  tokensList?: Token[];
  swapFeeInfo?: SwapFeeInfo;
}

const SwapCard: React.FC<SwapCardProps> = ({ ...other }) => {
  const theme = useTheme();

  // Using the store
  const storePersist = usePersistStore();
  const appStore = useAppStore();

  const { executeContractTransaction } = useContractTransaction();

  const [txBroadcasting, setTxBroadcasting] = useState<boolean>(false);
  const [loadingSimulate, setLoadingSimulate] = useState<boolean>(false);

  const [maxSlippage, setMaxSlippage] = useState<number>(10_000); // bps
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [networkFee, setNetworkFee] = useState<string>('');
  const [poolFee, setPoolFee] = useState<string>('');
  const [priceImpact, setPriceImpact] = useState<number>(0); // bps

  const [trustlineButtonActive, setTrustlineButtonActive] = useState<boolean>(false);
  const [trustlineTokenName, setTrustlineTokenName] = useState<string>('');
  const [trustlineAssetAmount, setTrustlineAssetAmount] = useState<number>(0);
  const [allPools, setAllPools] = useState<any[]>([]);

  // 1) States for tokens, default sell token is first in the list
  const [tokens, setTokens] = useState<Token[]>([]);
  const [sellToken, setSellToken] = useState<Token | null>(tokens.length ? tokens[0] : null);
  const [buyToken, setBuyToken] = useState<Token | null>(null);

  // 2) State for the user’s sell amount
  const [amount, setAmount] = useState<string>('0');

  // 3) Popup states for picking tokens
  const [open, setOpen] = useState(false);
  const [activeButton, setActiveButton] = useState<'sell' | 'buy' | ''>('');

  // 4) State for review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleReviewClose = () => setReviewOpen(false);

  // 4) Quote states
  const [isLoading, setIsLoading] = useState(false);
  const [quoteFetched, setQuoteFetched] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Compute the fiat value for the user’s sell input
  const sellVal = parseFloat(amount) || 0;
  const sellFiatValue = sellToken && sellVal > 0 ? sellVal * sellToken.pricestatus : 0;

  // 5) Example of how much buyToken the user might get
  const [buyAmount, setBuyAmount] = useState<number>(0);

  // 6) Open/close the token picker
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // 7) Auto-fetch quote whenever relevant fields change: sellToken, buyToken, amount
  useEffect(() => {
    // Clear old quote state each time we start a new calculation
    setIsLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);

    // Make sure we have both tokens
    if (!sellToken || !buyToken) return;

    // If user hasn't typed anything or typed 0
    if (!amount || sellVal <= 0) {
      return;
    }

    // Start “fetching” quote
    setIsLoading(true);

    doSimulateSwap();

    const buyTokenContractID = appStore.allTokens.find(
      (token: Token) => token.name === buyToken.name
    )?.contractId;

    if (storePersist.wallet.address) {
      handleTrustLine(buyTokenContractID);
    }

    // Simulate an async fetch with a 1s delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      setQuoteFetched(true);

      const potentialBuyAmount = sellVal * (sellToken.pricestatus / buyToken.pricestatus);
      setBuyAmount(potentialBuyAmount);

      if (sellVal > sellToken.countstatus) {
        setInsufficientBalance(true);
      }
    }, 1000);

    // Cleanup if user changes input quickly
    // eslint-disable-next-line consistent-return
    return () => clearTimeout(timer);
  }, [sellToken, buyToken, amount, sellVal]);

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
    if (activeButton === 'sell') {
      if (buyToken && buyToken.id === token.id) {
        setBuyToken(null);
      }
      setSellToken(token);
    } else if (activeButton === 'buy') {
      if (sellToken && sellToken.id === token.id) {
        setSellToken(null);
      }
      setBuyToken(token);
    }
  };

  // Function to invert tokens and amounts
  const handleInvertTokens = () => {
    if (!sellToken || !buyToken) return;

    const oldSellToken = sellToken;
    const oldBuyToken = buyToken;
    const oldBuyAmount = buyAmount;

    // Swap tokens
    setSellToken(oldBuyToken);
    setBuyToken(oldSellToken);

    // Swap amounts: set the input to reflect the old calculated buy amount
    const newTypedAmount = oldBuyAmount > 0 ? oldBuyAmount.toFixed(6).replace(',', '.') : '0';
    setAmount(newTypedAmount);

    // Reset quote states
    setIsLoading(false);
    setQuoteFetched(false);
    setInsufficientBalance(false);
    setBuyAmount(0);
  };

  // 10) Derive the main button’s label
  const getButtonLabel = (): string => {
    if (!sellToken || !buyToken) {
      return 'Select a token';
    }
    if (sellVal <= 0) {
      return 'Enter an amount';
    }
    if (isLoading) {
      return 'Finalizing quote...';
    }
    if (quoteFetched) {
      if (insufficientBalance) {
        return `Insufficient ${sellToken.shortname}`;
      }
      if (trustlineButtonActive) {
        return 'Add trustline';
      }
      return 'Review';
    }
    return 'Enter an amount';
  };

  // Different button states have different actions
  const handleMainButtonClick = () => {
    const label = getButtonLabel();
    if (label === 'Select a token') {
      return;
    } else if (label === 'Enter an amount') {
      return;
    } else if (label === 'Finalizing quote...') {
      return;
    } else if (label.startsWith('Insufficient')) {
      return;
    } else if (label === 'Add trustline') {
      addTrustLine();
    } else if (label === 'Review') {
      // open a review popup
      setReviewOpen(true);
    }
  };

  // Max the sell token
  const handleMaxClick = () => {
    if (sellToken) {
      setAmount(sellToken.countstatus.toString());
    }
  };

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const getAllTokens = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const allTokens = await appStore.getAllTokens();
        setTokens(allTokens.slice(2));
        setSellToken(allTokens[0]);
        setBuyToken(allTokens[1]);
        setIsLoading(false);

        // Get all pools
        const poolRouterContract = new NormalPoolRouterContract.Client({
          contractId: constants.POOL_ROUTER_ADDRESS,
          networkPassphrase: constants.NETWORK_PASSPHRASE,
          rpcUrl: constants.RPC_URL,
        });
        const { result } = await poolRouterContract.query_all_pools_details();

        const _allPools = result.map((pool: any) => ({
          asset_a: pool.pool_response.asset_a.address,
          asset_b: pool.pool_response.asset_b.address,
        }));
        setAllPools(_allPools);
      } catch (e) {
        console.error(e);
      } finally {
        appStore.setLoading(false);
      }
    };
    getAllTokens();
  }, []);

  /**
   * Executes the swap transaction.
   * This function signs and sends the transaction using WalletConnect or Signer.
   *
   * @async
   */
  const doSwap = useCallback(async (): Promise<void> => {
    if (sellToken && buyToken) {
      try {
        // Execute the transaction using the hook
        await executeContractTransaction({
          contractType: 'pool_router',
          contractAddress: constants.POOL_ROUTER_ADDRESS,
          transactionFunction: async (client, restore) =>
            client.swap(
              {
                user: storePersist.wallet.address!,
                tokens: [sellToken.address, buyToken.address],
                token_in: sellToken.address,
                token_out: buyToken.address,
                pool_index: Buffer.from('0'),
                in_amount: BigInt(amount),
                out_min: BigInt(buyAmount),
              },
              { simulate: !restore }
            ),
        });

        // Wait for the next block and fetch token balances
        setTimeout(async () => {
          await appStore.fetchTokenInfo(sellToken.name!);
          await appStore.fetchTokenInfo(buyToken.name!);
        }, 7000);
      } catch (error) {
        console.log('Error during swap transaction', error);
      }
    }
  }, [
    appStore,
    sellToken?.name,
    storePersist,
    buyToken?.name,
    amount,
    buyAmount,
    executeContractTransaction,
  ]);

  /**
   * Simulates the swap transaction to determine the exchange rate and network fee.
   *
   * @async
   */
  const doSimulateSwap = useCallback(async (): Promise<void> => {
    if (sellToken && buyToken) {
      if (amount === '0') {
        // setTokenAmounts([0, 0]);
        setAmount('0');
        setBuyAmount(0);
        setExchangeRate('');
        setNetworkFee('');
        return;
      }

      setLoadingSimulate(true);
      try {
        const poolRouterContract = new NormalPoolRouterContract.Client({
          contractId: constants.POOL_ROUTER_ADDRESS,
          networkPassphrase: constants.NETWORK_PASSPHRASE,
          rpcUrl: constants.RPC_URL,
        });

        const poolInfo = await poolRouterContract.query_pool_details({
          pool_address: '',
        });

        const tx = await poolRouterContract.estimate_swap({
          tokens: [sellToken.address, buyToken.address],
          token_in: sellToken.address,
          token_out: buyToken.address,
          pool_index: Buffer.from('0'),
          in_amount: BigInt(amount),
        });

        if (poolInfo.result && tx.result) {
          const _exchangeRate = Number(tx.result) / Number(amount);

          setExchangeRate(
            `${(_exchangeRate / 10 ** 7).toFixed(2)} ${buyToken?.name} per ${sellToken?.name}`
          );
          // setNetworkFee(
          //   `${Number(tx.result.commission_amounts[0][1]) / 10 ** 7} ${sellToken?.name}`
          // );
          setPoolFee(poolInfo.result.total_fee_bps.toString());

          // dy = (y * dx) / (x + dx)
          const dy =
            (poolInfo.result.pool_response.asset_b.amount * BigInt(amount)) /
            (poolInfo.result.pool_response.asset_a.amount + BigInt(amount));

          const execution_price = BigInt(amount) / dy;
          const market_price =
            poolInfo.result.pool_response.asset_a.amount /
            poolInfo.result.pool_response.asset_b.amount;

          // price_impact = (execution_price - market_price) / market_price * 100
          const _priceImpact = BigInt((execution_price - market_price) / market_price) * BigInt(100);
          setPriceImpact(Number(_priceImpact));

          // setTokenAmounts((prevAmounts) => {
          //   const newToTokenAmount = Number(tx.result.ask_amount) / 10 ** 7;
          //   return [prevAmounts[0], newToTokenAmount];
          // });
        }
      } catch (e) {
        console.log(e);
      }
      setLoadingSimulate(false);
    }
  }, [sellToken?.name, buyToken, amount, buyAmount]);

  /**
   * Handles adding a trustline for a token.
   *
   * @param {string} tokenAddress - The address of the token.
   * @async
   */
  const handleTrustLine = useCallback(
    async (tokenAddress: string): Promise<void> => {
      const trust = await checkTrustline(storePersist.wallet.address!, tokenAddress);
      setTrustlineButtonActive(!trust.exists);
      // setTrustlineTokenSymbol(trust.asset?.code || '');
      const tlAsset = await appStore.fetchTokenInfo(
        'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA'
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      setTrustlineAssetAmount(Number(tlAsset?.balance) / 10 ** tlAsset?.decimals!);
      setTrustlineTokenName(trust.asset?.contract || '');
    },
    [storePersist.wallet.address]
  );

  /**
   * Adds a trustline for the specified token.
   *
   * @async
   */
  const addTrustLine = useCallback(async (): Promise<void> => {
    try {
      setTxBroadcasting(true);
      await fetchAndIssueTrustline(storePersist.wallet.address!, trustlineTokenName);
      setTrustlineButtonActive(false);
    } catch (e) {
      console.log(e);
    }
    setTxBroadcasting(false);
  }, [storePersist.wallet.address, trustlineTokenName]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Invert tokens button in the middle */}
        <Box
          onClick={handleInvertTokens}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '44px',
            height: '44px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '6px',
            overflow: 'hidden',
            zIndex: 2,
            cursor: 'pointer',
            padding: '4px',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: 'inherit',
              backgroundColor:
                theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.grey[900],
              transition: 'background-color 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor:
                  theme.palette.mode === 'light'
                    ? theme.palette.grey[400]
                    : theme.palette.grey[700],
              },
            }}
          >
            <Iconify
              width={24}
              icon="eva:arrow-downward-fill"
              sx={{
                color:
                  theme.palette.mode === 'light'
                    ? theme.palette.text.primary
                    : theme.palette.common.white,
              }}
            />
          </Box>
        </Box>

        {/* SELL Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            height: '160px',
            padding: theme.spacing(2),
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderRadius: '8px',
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
              <Typography variant="body1" noWrap>
                Sell
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
                {`${fCurrency(sellFiatValue)}`}
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
            {sellToken ? (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
              >
                <SwapSendPopupButton
                  imgUrl={sellToken.url}
                  label={sellToken.shortname}
                  onClick={() => {
                    setActiveButton('sell');
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
                      {sellToken.countstatus}{' '}
                      <Box
                        component="span"
                        sx={{
                          color: insufficientBalance
                            ? theme.palette.error.main
                            : theme.palette.text.primary,
                        }}
                      >
                        {sellToken?.shortname}
                      </Box>
                    </Typography>
                  </Box>
                  <Button
                    variant="soft"
                    color="success"
                    size="small"
                    onClick={handleMaxClick}
                    disabled={isLoading}
                    sx={{
                      fontWeight: 500,
                      fontSize: '12px',
                      p: 0,
                      height: '24px',
                      minWidth: '36px',
                    }}
                  >
                    Max
                  </Button>
                </Box>
              </Box>
            ) : (
              <SwapSendEmptyPopupButton
                label="Select token"
                onClick={() => {
                  setActiveButton('sell');
                  handleOpen();
                }}
              />
            )}
          </Box>
        </Box>

        {/* BUY Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            height: '160px',
            padding: theme.spacing(2),
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '8px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              minWidth: 0,
              overflow: 'hidden',
              gap: 2,
            }}
          >
            <Typography variant="body1" noWrap>
              Buy
            </Typography>

            <Box
              sx={{
                maxWidth: '100%',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              <Typography
                sx={{
                  display: 'inline-block',
                  fontSize: 'var(--h3-size, 32px)',
                  fontStyle: 'normal',
                  fontWeight: 'var(--h3-weight, 700)',
                  lineHeight: 'var(--h3-line-height, 48px)',
                  letterSpacing: 'var(--h3-letter-spacing, 0px)',
                  color: !quoteFetched ? theme.palette.text.secondary : theme.palette.text.primary,
                }}
              >
                {quoteFetched && buyToken ? buyAmount.toFixed(6) : 0}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 'var(--components-nav-item-size, 14px)',
                fontStyle: 'normal',
                fontWeight: 'var(--components-nav-item-weight, 500)',
                lineHeight: 'var(--components-nav-item-line-height, 22px)',
                opacity: quoteFetched && buyToken ? 1 : 0,
                whiteSpace: 'nowrap',
                overflow: 'visible',
              }}
            >
              {buyToken ? `${fCurrency(buyToken.pricestatus * buyAmount)}` : '$0'}
            </Typography>
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
            {buyToken ? (
              <SwapSendPopupButton
                imgUrl={buyToken.url}
                label={buyToken.shortname}
                onClick={() => {
                  setActiveButton('buy');
                  handleOpen();
                }}
              />
            ) : (
              <SwapSendEmptyPopupButton
                label="Select token"
                onClick={() => {
                  setActiveButton('buy');
                  handleOpen();
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Main button with multiple states */}
      <Box>
        <Button
          fullWidth
          variant="soft"
          color="success"
          size="large"
          onClick={handleMainButtonClick}
          disabled={isLoading}
        >
          {getButtonLabel()}
        </Button>
      </Box>

      {/* Additional box with fee info */}
      {quoteFetched && !isLoading && (
        <FeeInfoAccordion
          conversionText={sellToken && buyToken ? getConversionText(sellToken, buyToken) : ''}
          insufficientBalance={insufficientBalance}
          sellToken={sellToken || undefined}
          poolFee={Number(poolFee)}
          networkCost={0}
          priceImpact={priceImpact ?? 0}
          maxSlippage={maxSlippage}
          sellFiatValue={sellFiatValue}
        />
      )}

      {reviewOpen && (
        <SwapReview
          open={reviewOpen}
          onClose={handleReviewClose}
          sellToken={sellToken!}
          buyToken={buyToken!}
          sellAmount={amount}
          buyAmount={buyAmount}
          feePercentage={poolFee}
          networkCost={networkFee ?? '0'}
          priceImpact={priceImpact ?? 0}
          maxSlippage={maxSlippage}
          sellFiatValue={sellFiatValue}
          onSubmit={() => doSwap()}
        />
      )}

      {/* Token Picker Popup */}
      <PickToken
        open={open}
        onClose={handleClose}
        buttonSource={activeButton}
        tokens={tokens}
        onTokenSelect={handleTokenSelect}
      />
    </Box>
  );
};

export default SwapCard;
