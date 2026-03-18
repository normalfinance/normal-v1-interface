import { DisclaimerActions } from './disclaimer';
import { Wallet } from './wallet';
import { ReferralActions } from './referral';
import { TokenActions } from './token';

export interface PersistWalletActions {
  connectWallet: (walletAddress: string, walletType?: string) => Promise<void>;
  disconnectWallet: () => void;
  wallet: Wallet;
}

export type AppStorePersistV1 = PersistWalletActions &
  DisclaimerActions &
  ReferralActions &
  TokenActions;

export type AppStorePersist = AppStorePersistV1;
