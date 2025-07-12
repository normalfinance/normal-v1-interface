'use client';

import type { Token } from '@/types/token';
import type { SwapFeeInfo } from '@/types/swap-fee-info';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import { Box } from '@mui/material';

import { SwapSendCard } from '@/components/_common/swap-send-card';
import TokenActionCard from '@/components/_common/token-action-card';

const tokensList: Token[] = [
  {
    id: 1,
    url: 'https://token-icons.s3.amazonaws.com/eth.png',
    name: 'Ethereum',
    shortname: 'ETH',
    owned: true,
    countstatus: 0.02106,
    pricestatus: 2814.25,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 2,
    url: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
    name: 'USDC',
    shortname: 'USDC',
    owned: false,
    countstatus: 0,
    pricestatus: 0.9998,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 3,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    name: 'Tether',
    shortname: 'USDT',
    owned: false,
    countstatus: 0,
    pricestatus: 0.9999,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },

  {
    id: 4,
    url: 'https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1696507857',
    name: 'Wrapped Bitcoin',
    shortname: 'WBTC',
    owned: false,
    countstatus: 0,
    pricestatus: 95799.17,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 5,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    name: 'Wrapped Ether',
    shortname: 'WETH',
    owned: false,
    countstatus: 0,
    pricestatus: 2806.75,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 6,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    name: 'Wrapped Ether',
    shortname: 'WETH',
    owned: false,
    countstatus: 0,
    pricestatus: 2806.75,
    featured: false,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
];

const swapFeeInfo: SwapFeeInfo = {
  feePercentage: 0.25,
  networkCost: 1.0,
  priceImpact: -0.3,
  maxSlippage: 0.5,
};

const cashBalance = 1000;

export default function SwapView() {
  const { t } = useTranslate();
  return (
    <DashboardContent maxWidth="xl">
      <Box
        sx={{
          display: 'flex',
          minHeight: '60vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box maxWidth={500} width={1}>
          <Box width={1}>
            <TokenActionCard
              tokensList={tokensList}
              swapFeeInfo={swapFeeInfo}
              cashBalance={cashBalance}
            />
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}
