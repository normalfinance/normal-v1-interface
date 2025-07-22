export interface ReferralState {
  referralCode: string | null;
  referralTimestamp: number | null;
  hasReferral: boolean;
  referralUsed: boolean;
  usedActions: string[];
}

export interface ReferralActions {
  setReferralCode: (code: string) => void;
  clearReferralCode: () => void;
  markReferralUsed: (action?: string) => void;
  getReferralFromCookie: () => ReferralState;
  referralState: ReferralState;
}
