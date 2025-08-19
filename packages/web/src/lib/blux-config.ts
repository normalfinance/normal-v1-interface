// Feature flag for gradual Blux rollout
export const ENABLE_BLUX_AUTH = process.env.NEXT_PUBLIC_ENABLE_BLUX_AUTH === 'true';

console.log('🔧 Blux Config: Environment variables check', {
  NEXT_PUBLIC_ENABLE_BLUX_AUTH: process.env.NEXT_PUBLIC_ENABLE_BLUX_AUTH,
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  enabled: ENABLE_BLUX_AUTH,
});

const defaultNetwork =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

console.log('🔧 Blux Config: Network determination', {
  envNetwork: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  defaultNetwork,
  willUseMainnet: process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet',
});

// Define transport URLs explicitly to avoid any undefined issues
const TRANSPORT_URLS = {
  testnet: {
    horizon: 'https://horizon-testnet.stellar.org',
    soroban: 'https://soroban-testnet.stellar.org',
  },
  mainnet: {
    horizon: 'https://horizon.stellar.org',
    soroban: 'https://soroban.stellar.org',
  },
};

console.log('🔧 Blux Config: Transport URLs defined', TRANSPORT_URLS);

const SIMPLE_CONFIG = {
  appName: 'Normal Finance',
  networks: ['testnet'],
  defaultNetwork: 'testnet',
  transports: {
    testnet: {
      horizon: 'https://horizon-testnet.stellar.org',
      soroban: 'https://soroban-testnet.stellar.org',
    },
  },
  loginMethods: ['wallet', 'email'],
  showWalletUIs: true,
  explorer: 'stellarexpert',
};

// Blux Provider Configuration (no API keys needed)
export const BLUX_CONFIG = {
  appName: 'Normal Finance',
  networks: ['testnet', 'mainnet'],
  defaultNetwork,

  // Add transports configuration for custom networks - this fixes the "Must set transports" error
  // Using the same URLs as the existing app configuration
  transports: TRANSPORT_URLS,

  appearance: {
    theme: 'light', // or 'dark'
    accent: '#1976d2', // Primary color
    background: '#ffffff',
    textColor: '#333333',
    font: 'Inter, sans-serif',
    borderRadius: '8px',
  },
  loginMethods: ['wallet', 'email', 'google', 'passkey'], // Available auth methods
  showWalletUIs: true, // Show wallet connection UIs
  explorer: 'stellarexpert', // Block explorer
};

// Export simple config for debugging
export const BLUX_CONFIG_SIMPLE = SIMPLE_CONFIG;

console.log('✅ Blux Config: Configuration created', BLUX_CONFIG);

export default BLUX_CONFIG;
