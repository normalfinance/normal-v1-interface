import 'react-loading-skeleton/dist/skeleton.css';

import type { CardProps } from '@mui/material/Card';
import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { StateToken as Token } from '@normalfinance/types';

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import { useTabs } from 'minimal-shared/hooks';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { logger } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import BuyCard from './buy-card';
import SwapCard from './swap-card';
import SendCard from './send-card';
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
  /** Show skeleton loading state */
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
    logger.warn('TokenActionCard: enabledTabs is empty – defaulting to all tabs.');
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
    () => tokensList!.filter((tkn) => tkn.symbol === 'XLM' || tkn.symbol === 'USDC'),
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
          display: 'flex',
          flexDirection: 'column',
          minWidth: 200,
          maxWidth: '100%',
          minHeight: 380,
          maxHeight: 800,
          p: 1.5,
          gap: 0.5,
          borderRadius: 4,
          ...sx,
        }}
        {...other}
      >
        <Stack spacing={2}>
          {/* Header if title exists */}
          {title && (
            <Box sx={{ mb: 1 }}>
              <Skeleton height={28} width="60%" />
              {subheader && <Skeleton height={16} width="80%" />}
            </Box>
          )}

          {/* Tabs */}
          <Stack direction="row" spacing={1}>
            <Skeleton height={34} width={60} />
            <Skeleton height={34} width={60} />
            <Skeleton height={34} width={60} />
          </Stack>

          {/* Form fields */}
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Stack direction="row" spacing={1}>
              <Skeleton height={20} width="30%" />
              <Skeleton height={20} width="40%" />
            </Stack>
            <Skeleton height={48} />
          </Stack>
        </Stack>
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
