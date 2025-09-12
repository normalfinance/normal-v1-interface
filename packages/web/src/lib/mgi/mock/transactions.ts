import type { Amount, Sep24Transaction } from '../types';

const USDC = (v: string): Amount => ({ amount: v, asset: 'USDC' });

const WALLET = 'GBTCWUTSVDK4JG2ILSGLXOVTMS652DWMDZVF42RYERJR6AWXYIFUP54P';
const ANCHOR = 'GCMGIANCHORACCOUNTONTESTNETDEMO000000000000000000000000';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const minutesAgo = (m: number) => iso(new Date(now.getTime() - m * 60_000));

export const MOCK_TX: Sep24Transaction[] = [
  {
    id: 'tx_deposit_pending_001',
    kind: 'deposit',
    status: 'pending_user_transfer_start',
    started_at: minutesAgo(8),
    updated_at: minutesAgo(1),
    amount_in: USDC('50'),
    amount_out: USDC('49.50'),
    amount_fee: USDC('0.50'),
    from: 'CASH@AGENT',
    to: WALLET,
    more_info_url: 'https://extstellar.moneygram.com/…/tx/tx_deposit_pending_001',
    message: 'KYC complete, user instructed to drop off cash (sandbox simulated).',
  },
  {
    id: 'tx_deposit_completed_002',
    kind: 'deposit',
    status: 'completed',
    started_at: minutesAgo(120),
    completed_at: minutesAgo(115),
    updated_at: minutesAgo(115),
    amount_in: USDC('120'),
    amount_out: USDC('119.00'),
    amount_fee: USDC('1.00'),
    from: 'CASH@AGENT',
    to: WALLET,
    stellar_transaction_id: 'a35135d8ed4b29b6…844364a',
    more_info_url: 'https://extstellar.moneygram.com/…/tx/tx_deposit_completed_002',
  },
  {
    id: 'tx_withdraw_pending_003',
    kind: 'withdrawal',
    status: 'pending_user_transfer_start',
    started_at: minutesAgo(25),
    updated_at: minutesAgo(3),
    amount_in: USDC('75.00'),
    amount_out: USDC('74.25'),
    amount_fee: USDC('0.75'),
    from: WALLET,
    to: ANCHOR,
    external_transaction_id: 'MGI-REF-99223311',
    more_info_url: 'https://extstellar.moneygram.com/…/tx/tx_withdraw_pending_003',
    memo: '44556677',
    memo_type: 'id',
    message: 'Anchor ready; wallet must send USDC with the provided memo.',
  },
  {
    id: 'tx_withdraw_refunded_004',
    kind: 'withdrawal',
    status: 'refunded',
    started_at: minutesAgo(600),
    refunded_at: minutesAgo(580),
    updated_at: minutesAgo(580),
    amount_in: USDC('200.00'),
    amount_out: USDC('0'),
    from: WALLET,
    to: ANCHOR,
    external_transaction_id: 'MGI-REF-55500077',
    refunds: {
      amount_refunded: USDC('200.00'),
      amount_fee: USDC('0.00'),
    },
    message: 'User canceled at agent; full refund issued.',
  },
  {
    id: 'tx_withdraw_error_small_005',
    kind: 'withdrawal',
    status: 'too_small',
    started_at: minutesAgo(1440),
    updated_at: minutesAgo(1435),
    amount_in: USDC('0.5'),
    from: WALLET,
    to: ANCHOR,
    message: 'Below network/anchor minimum.',
  },
  {
    id: 'tx_deposit_expired_006',
    kind: 'deposit',
    status: 'expired',
    started_at: minutesAgo(2880),
    updated_at: minutesAgo(2700),
    amount_in: USDC('40.00'),
    from: 'CASH@AGENT',
    to: WALLET,
    more_info_url: 'https://extstellar.moneygram.com/…/tx/tx_deposit_expired_006',
    message: 'Window expired; start a new deposit.',
  },
];
