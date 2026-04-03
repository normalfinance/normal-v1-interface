export type WalletActivityKind = 'vault_deposit' | 'vault_withdraw' | 'swap' | 'sponsorship';

interface ActivityItemBase {
  kind: WalletActivityKind;
  id: string;
  createdAt: string;
  txHash: string | null;
}

export type WalletActivityItem =
  | (ActivityItemBase & {
      kind: 'vault_deposit';
      amount: string;
      vaultAddress: string;
    })
  | (ActivityItemBase & {
      kind: 'vault_withdraw';
      amount: string;
      vaultAddress: string;
    })
  | (ActivityItemBase & {
      kind: 'swap';
      tokenInAddress: string;
      tokenOutAddress: string;
      tokenInSymbol: string | null;
      tokenOutSymbol: string | null;
      amountIn: string;
      amountOut: string;
    })
  | (ActivityItemBase & {
      kind: 'sponsorship';
    });

export interface WalletActivityResponse {
  success: boolean;
  items?: WalletActivityItem[];
  error?: string;
}
