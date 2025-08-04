// analytics.ts

import { ContractType } from '../general';

// Define the shape of each custom event
export type AnalyticsEventMap = {
  // 🔐 Wallet events
  wallet_connected: {
    provider: string; // e.g., 'Freighter', 'Hana'
    address: string;
    network: string; // e.g., 'mainnet', 'testnet'
  };
  wallet_disconnected: {
    address?: string; // optional if user disconnected anonymously
  };

  // 🔗 Blockchain interaction
  transaction_submitted: {
    txHash: string;
    contractName: ContractType;
    contractAddress: string;
    method: string;
    gasEstimate?: number;
    value?: string; // if sending value
  };
  transaction_failed: {
    error: string;
    contractName: ContractType;
    contractAddress: string;
    method: string;
  };
  transaction_successful: {
    txHash: string;
    contractName: ContractType;
    contractAddress: string;
    method: string;
  };

  // ✍️ UI interactions
  form_field_edited: {
    field: string;
    value: string | number;
    context?: string; // e.g., 'deposit_form', 'settings_form'
  };
  button_clicked: {
    label: string; // Button label or identifier
    location: string; // Where in the UI it occurred
  };
  popup_opened: {
    name: string; // e.g., 'connect_wallet', 'withdraw_modal'
    trigger?: string; // what triggered it (e.g., 'button', 'auto')
  };
  popup_closed: {
    name: string;
  };

  // 📄 Navigation / pageview
  viewed_page: {
    path: string; // e.g., '/dashboard'
    referrer?: string; // Optional previous route
  };

  // 🧪 Custom interaction
  custom_event: {
    category: string; // e.g., 'staking', 'rewards'
    action: string; // e.g., 'claim_clicked'
    label?: string;
    value?: string | number;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
