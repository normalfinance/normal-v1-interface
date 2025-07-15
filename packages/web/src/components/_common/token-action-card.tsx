import type { CardProps } from '@mui/material/Card';
import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { StateToken as Token } from '@normalfinance/types';

import React, { useEffect } from 'react';
import { useTabs } from 'minimal-shared/hooks';
import { useAppStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import { Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import BuyCard from './buy-card';
import SwapCard from './swap-card';
import SendCard from './send-card';
import { CustomTabsSwapSend } from './swap-send-card-custom-card';

// ----------------------------------------------------------------------
// TYPES & CONSTANTS -----------------------------------------------------

export type TokenActionKey = 'swap' | 'send' | 'buy';

interface ActionConfig {
  value: TokenActionKey;
  label: string;
}

const ALL_TABS: readonly ActionConfig[] = [
  { value: 'swap', label: 'Swap' },
  { value: 'send', label: 'Send' },
  { value: 'buy', label: 'Buy' },
] as const;

// ----------------------------------------------------------------------
// PROPS -----------------------------------------------------------------

export interface TokenActionCardProps extends CardProps {
  /** Main title displayed in the card header */
  title?: string;
  /** Optional subtitle displayed under the title */
  subheader?: string;
  /** Tokens available for the child action components */
  tokensList?: Token[];
  /** Swap‑fee info, forwarded to **SwapCard** and **SendCard** */
  swapFeeInfo?: SwapFeeInfo;
  /**
   * Which action tabs should be enabled. If omitted, **all** known tabs are shown.
   * Example: `['swap', 'buy']` will hide the **Send** tab.
   */
  enabledTabs?: TokenActionKey[];

  cashBalance?: number;
}

// ----------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------

export const TokenActionCard: React.FC<TokenActionCardProps> = ({
  sx,
  title,
  subheader,
  tokensList,
  swapFeeInfo,
  enabledTabs,
  cashBalance,
  ...other
}) => {
  const theme = useTheme();

  const store = useAppStore();

  // Determine which tabs are active for this instance ------------------
  const activeTabs = React.useMemo<ActionConfig[]>(
    () => ALL_TABS.filter((tab) => !enabledTabs || enabledTabs.includes(tab.value)),
    [enabledTabs]
  );

  // Fallback: at least one tab must be rendered ------------------------
  if (activeTabs.length === 0) {
    console.warn('TokenActionCard: enabledTabs is empty – defaulting to all tabs.');
    activeTabs.push(...ALL_TABS);
  }

  // Initialise the tab hook with the first available tab --------------
  const tabs = useTabs(activeTabs[0].value as TokenActionKey);

  const buyCardTokens = React.useMemo<Token[]>(
    () => store.tokens.filter((t) => t.symbol === 'XLM' || t.symbol === 'USDC'),
    [store.tokens]
  );

  // Helper – render the body matching the active tab -------------------
  const renderTabBody = () => {
    switch (tabs.value) {
      case 'swap':
        return <SwapCard tokensList={store.tokens} swapFeeInfo={swapFeeInfo} />;
      case 'send':
        return <SendCard tokensList={store.tokens} networkCost={0} />;
      case 'buy':
        return <BuyCard tokensList={buyCardTokens} cashBalance={cashBalance} />;
      default:
        return null;
    }
  };

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const getAllTokens = async (): Promise<void> => {
      store.setLoading(true);
      try {
        const allTokens = await store.getAllTokens();

        store.setLoading(false);
      } catch (e) {
        console.error(e);
      } finally {
        store.setLoading(false);
      }
    };
    getAllTokens();
  }, []);

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 200,
        maxWidth: '100%',
        minHeight: 380,
        maxHeight: 800,
        p: 1.5,
        gap: 0.5,
        borderRadius: 2,
        ...sx,
      }}
      {...other}
    >
      {/* Optional header ------------------------------------------------ */}
      {title && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5">{title}</Typography>
          {subheader && (
            <Typography variant="subtitle2" color="text.secondary">
              {subheader}
            </Typography>
          )}
        </Box>
      )}
      {activeTabs.length > 1 && (
        <CustomTabsSwapSend
          value={tabs.value}
          onChange={tabs.onChange}
          variant="standard"
          sx={{ bgcolor: 'background.paper', p: 0 }}
          slotProps={{
            flexContainer: { gap: 1, p: 0 },
            tab: {
              borderRadius: 1,
              px: 1.5,
              height: 34,
              color: theme.palette.text.primary,
            },
            selected: {},
            indicator: {
              boxShadow: 'none !important',
              backgroundColor: alpha(theme.palette.grey[500], 0.08),
              border: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {activeTabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </CustomTabsSwapSend>
      )}

      {/* Body ----------------------------------------------------------- */}
      {renderTabBody()}
    </Card>
  );
};

export default TokenActionCard;
