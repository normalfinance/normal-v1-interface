export enum TokenAmountButtonState {
  NOT_CONNECTED = 'NOT_CONNECTED',
  SELECT_TOKEN = 'SELECT_TOKEN',
  ENTER_AMOUNT = 'ENTER_AMOUNT',
  ZERO_BALANCE = 'ZERO_BALANCE',
  CHECKING_TRUSTLINE = 'CHECKING_TRUSTLINE',
  CREATE_TRUSTLINE = 'CREATE_TRUSTLINE',
  CREATING_TRUSTLINE = 'CREATING_TRUSTLINE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  SUBMIT = 'SUBMIT',
}

export interface ButtonConfig {
  label: string;
  disabled: boolean;
  action: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
}
