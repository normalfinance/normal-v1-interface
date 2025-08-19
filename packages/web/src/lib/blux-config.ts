import { networks } from '@bluxcc/react';

// Feature flag for gradual Blux rollout
export const ENABLE_BLUX_AUTH = process.env.NEXT_PUBLIC_ENABLE_BLUX_AUTH === 'true';

const defaultNetwork =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? networks.mainnet : networks.testnet;

const SIMPLE_CONFIG = {
  appName: 'Normal Finance',
  networks: [networks.testnet, networks.mainnet],
  defaultNetwork,
  loginMethods: ['wallet', 'email'],
  showWalletUIs: true,
  explorer: 'stellarexpert',
};

export const BLUX_CONFIG = {
  appName: 'Normal Finance',
  networks: [networks.testnet, networks.mainnet],
  defaultNetwork,
  appearance: {
    theme: 'light' as any,
    accent: '#1976d2',
    background: '#ffffff',
    textColor: '#333333',
    font: 'Inter, sans-serif',
    borderRadius: '8px',
  },
  loginMethods: ['wallet', 'email', 'google', 'passkey'],
  showWalletUIs: true,
  explorer: 'stellarexpert',
};

// Export simple config for debugging
export const BLUX_CONFIG_SIMPLE = SIMPLE_CONFIG;

console.log('✅ Blux Config: Configuration created', BLUX_CONFIG);

export default BLUX_CONFIG;
