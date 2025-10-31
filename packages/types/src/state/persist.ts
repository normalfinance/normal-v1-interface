import { DisclaimerActions } from './disclaimer';
import { Wallet } from './wallet';
import { ReferralActions } from './referral';
import { InviteCodeActions } from './invite-code';
import { PoolActions } from './pool';
import { TokenActions } from './token';

export interface PersistWalletActions {
  connectWallet: (walletAddress: string, walletType?: string) => Promise<void>;
  disconnectWallet: () => void;
  wallet: Wallet;
}

export type AppStorePersist = PersistWalletActions &
  DisclaimerActions &
  ReferralActions &
  InviteCodeActions &
  PoolActions &
  TokenActions;
