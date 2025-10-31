export interface Disclaimer {
  accepted: boolean;
  version: number;
  acceptedAt?: number;
}
export interface DisclaimerActions {
  disclaimer: Disclaimer;
  setDisclaimerAccepted: (accepted: boolean) => Promise<void>;
}
