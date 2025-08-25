import 'react-loading-skeleton/dist/skeleton.css';

import type { CardProps } from '@mui/material/Card';
import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { StateToken as Token } from '@normalfinance/types';

import React from 'react';
import { useTabs } from 'minimal-shared/hooks';
import { ZEALY_QUEST_IDS } from '@/global-config';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import { Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import BuyCard from './buy-card';
import SwapCard from './swap-card';
import SendCard from './send-card';
import { Spinner } from '../_async/spinner';
import ZealyHighlight from './zealy/zealy-highlight';
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
  title?: string;
  subheader?: string;
  tokensList?: Token[];
  swapFeeInfo?: SwapFeeInfo;
  enabledTabs?: TokenActionKey[];
  cashBalance?: number;
  loading?: boolean;
  queryParams?: any;
  initialTab?: TokenActionKey;
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
  loading,
  queryParams,
  initialTab,
  ...other
}) => {
  const theme = useTheme();

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
  const getInitialTab = (): TokenActionKey => {
    if (initialTab && activeTabs.some((tab) => tab.value === initialTab)) {
      return initialTab;
    }
    return activeTabs[0].value as TokenActionKey;
  };

  const tabs = useTabs(getInitialTab());

  const buyCardTokens = React.useMemo<Token[]>(
    () => (tokensList ?? []).filter((tkn) => tkn.symbol === 'XLM' || tkn.symbol === 'USDC'),
    [tokensList]
  );

  // Helper – render the body matching the active tab -------------------
  const renderTabBody = () => {
    switch (tabs.value) {
      case 'swap':
        return (
          <Box data-testid="swap-card" sx={{ position: 'relative' }}>
            <SwapCard tokensList={tokensList} swapFeeInfo={swapFeeInfo} queryParams={queryParams} />
            <ZealyHighlight questId={ZEALY_QUEST_IDS.swap} />
          </Box>
        );
      case 'send':
        return (
          <SendCard
            tokensList={tokensList}
            networkCost={0}
            queryParams={queryParams}
            data-testid="send-card"
          />
        );
      case 'buy':
        return (
          <BuyCard
            tokensList={buyCardTokens}
            cashBalance={cashBalance}
            queryParams={queryParams}
            data-testid="buy-card"
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card
        sx={{
          display: 'grid',
          placeItems: 'center',
          minWidth: 200,
          maxWidth: '100%',
          minHeight: 380,
          maxHeight: 800,
          p: 1.5,
          borderRadius: 4,
          ...sx,
        }}
        {...other}
      >
        <Spinner size={40} />
      </Card>
    );
  }

  return (
    <Card
      data-testid="token-action-card"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
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
              borderRadius: 9999,
            },
          }}
        >
          {activeTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              data-testid={`${tab.value}-tab`}
            />
          ))}
        </CustomTabsSwapSend>
      )}

      {/* Body ----------------------------------------------------------- */}
      {renderTabBody()}
    </Card>
  );
};

export default TokenActionCard;
