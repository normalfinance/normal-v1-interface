'use client';

import { useState } from 'react';
import { buildAuthHeaders } from '@/utils/http';

// ---------------------------------------------------------------------------
// Dev utility: sweep BTC from a previous Turnkey wallet address (same
// sub-org) to the user's current Bitcoin address. One passkey tap.
// Visit /dev/btc-sweep while signed in.
// ---------------------------------------------------------------------------

interface SweepQuote {
  psbtHex: string;
  subOrgId: string;
  fromAddress: string;
  destination: string;
  totalSat: number;
  feeSat: number;
  sweepAmountSat: number;
}

export default function BtcSweepPage() {
  const [fromAddress, setFromAddress] = useState('');
  const [quote, setQuote] = useState<SweepQuote | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [reattached, setReattached] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reattach = async () => {
    setBusy(true);
    setError(null);
    setReattached(null);
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/turnkey/reattach-btc', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fromAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setReattached(data.wallet.bitcoinAddress);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reattach');
    } finally {
      setBusy(false);
    }
  };

  const buildQuote = async () => {
    setBusy(true);
    setError(null);
    setQuote(null);
    setTxid(null);
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/turnkey/build-btc-sweep', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setQuote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build sweep');
    } finally {
      setBusy(false);
    }
  };

  const signAndBroadcast = async () => {
    if (!quote) return;
    setBusy(true);
    setError(null);
    try {
      const rpId = process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname;
      const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
      const { TurnkeyClient } = await import('@turnkey/http');
      const client = new TurnkeyClient(
        { baseUrl: 'https://api.turnkey.com' },
        new WebauthnStamper({ rpId })
      );

      const signResult = await client.signTransaction({
        type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
        timestampMs: String(Date.now()),
        organizationId: quote.subOrgId,
        parameters: {
          signWith: quote.fromAddress,
          unsignedTransaction: quote.psbtHex,
          type: 'TRANSACTION_TYPE_BITCOIN',
        },
      });

      const signedTx = signResult?.activity?.result?.signTransactionResult?.signedTransaction;
      if (!signedTx) throw new Error('Signing failed — no signed transaction returned');

      const res = await fetch('/api/turnkey/broadcast-btc', {
        method: 'POST',
        headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedTxHex: signedTx }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Broadcast failed (${res.status})`);
      setTxid(data.txid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sweep failed');
    } finally {
      setBusy(false);
    }
  };

  const fmt = (sat: number) => `${(sat / 1e8).toFixed(8)} BTC (${sat.toLocaleString()} sat)`;

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', fontFamily: 'monospace', padding: 16 }}>
      <h2>BTC sweep (dev utility)</h2>
      <p style={{ fontSize: 13, color: '#666' }}>
        Sweeps all BTC from a previous Turnkey wallet address in your sub-org to your current
        Bitcoin address. Signed with your passkey.
      </p>

      <input
        value={fromAddress}
        onChange={(e) => setFromAddress(e.target.value)}
        placeholder="Old address (bc1q…)"
        style={{ width: '100%', padding: 10, fontSize: 13, fontFamily: 'monospace' }}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          onClick={reattach}
          disabled={busy || !fromAddress.trim()}
          style={{ padding: '10px 18px', cursor: 'pointer', fontWeight: 700 }}
        >
          Reattach as my BTC address (no tx, no fees)
        </button>
        <button
          onClick={buildQuote}
          disabled={busy || !fromAddress.trim()}
          style={{ padding: '10px 18px', cursor: 'pointer' }}
        >
          {busy && !quote ? 'Building…' : 'Or: build sweep tx'}
        </button>
      </div>

      {reattached && (
        <div style={{ marginTop: 18, color: '#0a7a4d', fontSize: 13 }}>
          Done — your account now uses {reattached} as its Bitcoin address. Refresh the portfolio
          page.
        </div>
      )}

      {quote && (
        <div style={{ marginTop: 18, fontSize: 13, lineHeight: 1.8 }}>
          <div>From: {quote.fromAddress}</div>
          <div>To: {quote.destination}</div>
          <div>Balance: {fmt(quote.totalSat)}</div>
          <div>Fee: {fmt(quote.feeSat)}</div>
          <div>
            <strong>You receive: {fmt(quote.sweepAmountSat)}</strong>
          </div>
          <button
            onClick={signAndBroadcast}
            disabled={busy}
            style={{ marginTop: 12, padding: '10px 18px', cursor: 'pointer', fontWeight: 700 }}
          >
            {busy ? 'Signing…' : '2 — Sign with passkey & broadcast'}
          </button>
        </div>
      )}

      {txid && (
        <div style={{ marginTop: 18, color: '#0a7a4d', fontSize: 13 }}>
          Swept! Txid: {txid}
          <br />
          <a href={`https://mempool.space/tx/${txid}`} target="_blank" rel="noopener noreferrer">
            View on mempool.space
          </a>
        </div>
      )}

      {error && <div style={{ marginTop: 18, color: '#b91c1c', fontSize: 13 }}>{error}</div>}
    </div>
  );
}
