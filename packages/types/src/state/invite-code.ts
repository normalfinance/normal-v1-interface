export interface InviteCodeState {
  hasValidCode: boolean;
  inviteCode: string | null;
  verifiedAt: number | null;
  urlInviteCode: string | null;
}

export interface InviteCodeActions {
  inviteCode: InviteCodeState;
  checkWalletInviteStatus: (walletAddress: string) => Promise<boolean>;
  setInviteCodeAccepted: (code: string, walletAddress?: string) => Promise<void>;
  setUrlInviteCode: (code: string | null) => void;
  clearInviteCode: () => void;
}