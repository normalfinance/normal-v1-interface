export interface InviteCodeState {
  hasValidCode: boolean;
  inviteCode: string | null;
  verifiedAt: number | null;
}

export interface InviteCodeActions {
  inviteCode: InviteCodeState;
  checkWalletInviteStatus: (walletAddress: string) => Promise<boolean>;
  setInviteCodeAccepted: (code: string, walletAddress?: string) => Promise<void>;
  clearInviteCode: () => void;
}