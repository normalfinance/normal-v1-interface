import { DisclaimerActions } from './disclaimer';
import { Wallet } from './wallet';
import { ReferralActions } from './referral';
import { TokenActions } from './token';

export interface PersistWalletActions {
  connectWallet: (walletAddress: string, walletType?: string) => Promise<void>;
  disconnectWallet: () => void;
  wallet: Wallet;
  /**
   * Breadcrumb of the last wallet type the user CONNECTED — survives
   * disconnect on purpose (#32 chunk 1, doc 72 §4b). An empty wallet slot has
   * two meanings, and this disambiguates them: breadcrumb absent = fresh
   * device / cleared storage (auto-restore may run, today's behavior);
   * breadcrumb = an external type → the user's last choice was an external
   * wallet, so auto-restoring the Turnkey wallet would silently switch their
   * wallet (finding #42).
   */
  lastWalletType: string | undefined;
}

export type AppStorePersistV1 = PersistWalletActions &
  DisclaimerActions &
  ReferralActions &
  TokenActions;

export type AppStorePersist = AppStorePersistV1;
