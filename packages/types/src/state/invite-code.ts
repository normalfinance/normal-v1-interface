export interface InviteCodeState {
  hasValidCode: boolean;
  inviteCode: string | null;
  verifiedAt: number | null;
}

export interface InviteCodeActions {
  inviteCode: InviteCodeState;
  setInviteCodeAccepted: (code: string) => Promise<void>;
  clearInviteCode: () => void;
}