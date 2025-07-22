import { Disclaimer } from './disclaimer';
import { Wallet } from './wallet';
import { ReferralActions } from './referral';

export interface PersistWalletActions {
  connectWallet: (wallet: string) => Promise<void>;
  disconnectWallet: () => void;
  wallet: Wallet;
  disclaimer: Disclaimer;
  setDisclaimerAccepted: (accepted: boolean) => Promise<void>;
}

export type AppStorePersist = PersistWalletActions & ReferralActions;
