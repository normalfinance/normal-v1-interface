'use client';

import type { Token } from '@normalfinance/types';
import type { ChainId } from '@/lib/chains/registry';

import { BigNumber } from 'bignumber.js';
import { getChain } from '@/lib/chains/registry';
import { announceTransaction } from '@/lib/tx-events';
import { ETH_RPC_URL } from '@/hooks/use-chain-portfolio';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';

import type { SendParams, SendAdapter } from './index';

// ----------------------------------------------------------------------
// Native transfers on any EVM chain. The unsigned EIP-1559 transaction is
// built locally with viem, signed by Turnkey via the user's passkey (Turnkey
// signs Ethereum transactions natively), and broadcast over the chain's RPC.
//
// Parameterised by chain rather than hardcoded to Ethereum mainnet: one
// secp256k1 address is valid on every EVM chain, so adding Avalanche or Base
// is a registry entry plus an RPC — no new address, no new adapter, no
// database change. See docs/audit/34-chain-registry-plan.md.
// ----------------------------------------------------------------------

// Keep enough native gas token back to cover the send itself (21000 gas with
// generous fee headroom).
const GAS_RESERVE_ETH = 0.0005;

export interface EvmAdapterOptions {
  /** Registry chain to send on. Defaults to Ethereum mainnet. */
  chainId?: ChainId;
  /** RPC endpoint override; falls back to the Ethereum default. */
  rpcUrl?: string;
}

export function createEthereumAdapter(
  ethereumAddress: string,
  onError?: (msg: string) => void,
  options: EvmAdapterOptions = {}
): SendAdapter {
  const chainId: ChainId = options.chainId ?? 'ethereum';
  const chainDef = getChain(chainId);
  if (chainDef.kind !== 'evm') {
    throw new Error(`createEthereumAdapter called with non-EVM chain: ${chainId}`);
  }
  const rpcUrl = options.rpcUrl ?? ETH_RPC_URL;

  return {
    network: chainId,
    hasMemo: false,
    addressPlaceholder: '0x…',
    feeInfo: null,

    validateAddress(address: string): boolean {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    },

    getSpendableBalance(token: Token): BigNumber {
      const spendable = BigNumber(token.balance).minus(GAS_RESERVE_ETH);
      return spendable.gt(0) ? spendable : BigNumber(0);
    },

    async send(params: SendParams): Promise<string> {
      try {
        const info = await getTurnkeyWalletInfo();
        if (!info?.subOrgId) throw new Error('Turnkey wallet not found');
        const subOrgId = info.subOrgId;

        const { http, parseEther, createPublicClient, serializeTransaction } = await import('viem');
        const chains = await import('viem/chains');

        // Resolve the viem chain from the registry's EVM id, so a new EVM
        // chain needs no edit here.
        const viemChain = Object.values(chains).find(
          (c): c is (typeof chains)['mainnet'] =>
            typeof c === 'object' && c !== null && 'id' in c && c.id === chainDef.evmChainId
        );
        if (!viemChain) throw new Error(`Unsupported EVM chain id: ${chainDef.evmChainId}`);

        const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });
        const from = ethereumAddress as `0x${string}`;
        const to = params.destination as `0x${string}`;
        const value = parseEther(params.amount);

        // Ask the network what this exact send costs instead of assuming a
        // wallet-to-wallet transfer (#29). A plain wallet still answers
        // 21000; a CONTRACT destination (most exchange deposit addresses,
        // every smart wallet) answers its real cost — the old hardcoded
        // 21000 made those sends revert with the fee burned. An estimation
        // REVERT means the address cannot accept plain ETH at all — block
        // BEFORE any signature or fee is spent.
        let gasEstimate: bigint;
        try {
          gasEstimate = await client.estimateGas({ account: from, to, value });
        } catch {
          throw new Error(
            'This address cannot accept ETH directly. Double-check the destination — if it is an exchange, use its ETH deposit address, not a contract address.'
          );
        }
        const gas = (gasEstimate * 12n) / 10n; // 20% headroom

        const [nonce, fees] = await Promise.all([
          client.getTransactionCount({ address: from, blockTag: 'pending' }),
          client.estimateFeesPerGas(),
        ]);

        // Honest MAX: fail with a number the user can act on, not a node error.
        try {
          const balanceWei = parseEther(params.token.balance);
          const feeWei = gas * fees.maxFeePerGas;
          if (value + feeWei > balanceWei) {
            const shortEth = Number(value + feeWei - balanceWei) / 1e18;
            throw new Error(
              `Amount plus network fee exceeds your balance. Reduce the amount by about ${shortEth.toFixed(6)} ETH.`
            );
          }
        } catch (balanceErr: any) {
          if (balanceErr?.message?.startsWith('Amount plus network fee')) throw balanceErr;
          // Unparseable balance string — let the node be the judge.
        }

        const unsigned = serializeTransaction({
          chainId: viemChain.id,
          type: 'eip1559',
          nonce,
          to,
          value,
          gas,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });

        // Sign with Turnkey via the user's passkey (WebAuthn prompt)
        const rpId =
          typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
            : 'localhost';
        const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
        const { TurnkeyClient } = await import('@turnkey/http');
        const turnkeyClient = new TurnkeyClient(
          { baseUrl: 'https://api.turnkey.com' },
          new WebauthnStamper({ rpId })
        );

        const signResult = await turnkeyClient.signTransaction({
          type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
          timestampMs: String(Date.now()),
          organizationId: subOrgId,
          parameters: {
            signWith: ethereumAddress,
            // Turnkey expects the serialized tx without the 0x prefix
            unsignedTransaction: unsigned.startsWith('0x') ? unsigned.slice(2) : unsigned,
            type: 'TRANSACTION_TYPE_ETHEREUM',
          },
        });

        const signedTx = signResult?.activity?.result?.signTransactionResult?.signedTransaction;
        if (!signedTx) throw new Error('Signing failed — no signed transaction returned');

        const rawTx = signedTx.startsWith('0x') ? signedTx : `0x${signedTx}`;

        // Broadcast through the server funnel (#29): the signed tx is
        // recorded BEFORE broadcast, the server relays it (like BTC), and a
        // previous send with an unknown outcome blocks this one (409) — the
        // structural double-send guard. Custody unchanged: the tx above is
        // already fully signed by the passkey.
        const { buildAuthHeaders } = await import('@/utils/http');
        const res = await fetch('/api/send/execute', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: chainId,
            signedTx: rawTx,
            symbol: 'ETH',
            amount: params.amount,
            destination: params.destination,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Send failed. Please try again.');
        }
        const txHash: string = data.txHash;

        // Pending row + cache-bypassed refresh. On Ethereum the row also
        // covers Etherscan's indexing lag, which can run minutes behind an
        // already-confirmed transaction.
        announceTransaction({
          chain: 'ethereum',
          pendingSend: {
            txHash,
            symbol: 'ETH',
            amount: params.amount,
            destination: params.destination,
          },
        });

        // #62: fire ONE more refresh at the exact moment the chain confirms —
        // that is when a balance read is guaranteed fresh (the timer shots
        // above race the chain and the server cache floor).
        void import('@/lib/send-confirmation').then(({ watchSendConfirmation }) =>
          watchSendConfirmation('ethereum', txHash, () => {
            void import('@/lib/tx-events').then(({ announceConfirmation }) =>
              announceConfirmation('ethereum')
            );
          })
        );

        return txHash;
      } catch (err: any) {
        const msg: string = err?.shortMessage ?? err?.message ?? 'Ethereum transaction failed';
        onError?.(msg);
        return '';
      }
    },
  };
}
