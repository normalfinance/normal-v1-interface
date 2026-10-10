import { createHmac } from 'node:crypto';

import {
  isPublicIp,
  onrampSessionForm,
  stripeDestination,
  rampStatusForStripe,
  verifyStripeSignature,
} from './onramp';

describe('stripeDestination', () => {
  it('maps our assets to Stripe network + currency', () => {
    expect(stripeDestination('stellar', 'USDC')).toEqual({ network: 'stellar', currency: 'usdc' });
    expect(stripeDestination('stellar', 'XLM')).toEqual({ network: 'stellar', currency: 'xlm' });
    expect(stripeDestination('bitcoin', 'BTC')).toEqual({ network: 'bitcoin', currency: 'btc' });
    expect(stripeDestination('solana', 'USDC')).toEqual({ network: 'solana', currency: 'usdc' });
  });
  it('refuses asset/chain mismatches', () => {
    expect(stripeDestination('bitcoin', 'USDC')).toBeNull();
    expect(stripeDestination('stellar', 'BTC')).toBeNull();
  });
});

describe('onrampSessionForm', () => {
  it('locks the wallet address and restricts the UI to one asset', () => {
    const p = onrampSessionForm({
      chain: 'stellar',
      symbol: 'USDC',
      address: 'GABC',
      amountUsd: '25',
      clientIp: '8.8.8.8',
      metadata: { supabaseUid: 'u1' },
    })!;
    expect(p.get('wallet_addresses[stellar]')).toBe('GABC');
    expect(p.get('lock_wallet_address')).toBe('true');
    expect(p.getAll('destination_networks[]')).toEqual(['stellar']);
    expect(p.getAll('destination_currencies[]')).toEqual(['usdc']);
    expect(p.get('destination_currency')).toBe('usdc');
    expect(p.get('source_currency')).toBe('usd');
    expect(p.get('source_amount')).toBe('25');
    expect(p.get('customer_ip_address')).toBe('8.8.8.8');
    expect(p.get('metadata[supabaseUid]')).toBe('u1');
  });
  it('drops bad amounts and private IPs instead of failing the session', () => {
    const p = onrampSessionForm({
      chain: 'stellar',
      symbol: 'XLM',
      address: 'GABC',
      amountUsd: '12.345',
      clientIp: '10.0.0.5',
    })!;
    expect(p.has('source_amount')).toBe(false);
    expect(p.has('customer_ip_address')).toBe(false);
  });
  it('returns null for an unsupported pair', () => {
    expect(onrampSessionForm({ chain: 'bitcoin', symbol: 'XLM', address: 'bc1q' })).toBeNull();
  });
});

describe('isPublicIp', () => {
  it('rejects private, loopback and link-local ranges', () => {
    for (const ip of [
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '127.0.0.1',
      '169.254.1.1',
      '::1',
      'fd00::1',
      'fe80::1',
    ])
      expect(isPublicIp(ip)).toBe(false);
  });
  it('accepts public addresses', () => {
    expect(isPublicIp('172.32.0.1')).toBe(true);
    expect(isPublicIp('2606:4700::1111')).toBe(true);
  });
});

describe('verifyStripeSignature', () => {
  const secret = 'whsec_test';
  const body = '{"id":"evt_1","type":"crypto.onramp_session.updated"}';
  const now = 1_760_000_000;
  const sign = (t: number) => createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');

  it('accepts a fresh, correctly signed payload', () => {
    expect(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, secret, now)).toBe(true);
  });
  it('accepts when one of several v1 signatures matches (key rotation)', () => {
    expect(verifyStripeSignature(body, `t=${now},v1=deadbeef,v1=${sign(now)}`, secret, now)).toBe(
      true
    );
  });
  it('rejects a stale timestamp, a wrong secret and a tampered body', () => {
    expect(verifyStripeSignature(body, `t=${now - 600},v1=${sign(now - 600)}`, secret, now)).toBe(
      false
    );
    expect(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, 'other', now)).toBe(false);
    expect(verifyStripeSignature(body + ' ', `t=${now},v1=${sign(now)}`, secret, now)).toBe(false);
  });
  it('rejects missing or malformed headers without throwing', () => {
    expect(verifyStripeSignature(body, null, secret, now)).toBe(false);
    expect(verifyStripeSignature(body, 'garbage', secret, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${now},v1=zz`, secret, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, '', now)).toBe(false);
  });
});

describe('rampStatusForStripe', () => {
  it('maps Stripe session statuses onto the forward-only ramp machine', () => {
    expect(rampStatusForStripe('requires_payment')).toBe('provider_processing');
    expect(rampStatusForStripe('fulfillment_processing')).toBe('provider_processing');
    expect(rampStatusForStripe('fulfillment_complete')).toBe('provider_complete');
    expect(rampStatusForStripe('rejected')).toBe('failed');
  });
  it('ignores initialized and unknown statuses', () => {
    expect(rampStatusForStripe('initialized')).toBeNull();
    expect(rampStatusForStripe(undefined)).toBeNull();
  });
});
