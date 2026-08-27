import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { wireToUsdc } from '@/lib/cctp/decimals';
import { scopedAmountWire } from '@/lib/cctp/amounts';
import { userOwnsWallet } from '@/lib/wallet-ownership';
import { autopilotBurnUsdc } from '@/server/autopilot-burn';
import { autopilotEnabled } from '@/server/autopilot-signer';
import { ensureTransferGas } from '@/server/cctp-transfer-gas';

// #33 Stage 3 payoff — the server-side inbound burn. Called by the engine
// (or cron) once USDC lands on the user's Base address, INSTEAD of prompting
// a passkey mid-flow. Same checks the banner's client recover() performs,
// plus session ownership; any failure = the engine falls back to prompts.
export const dynamic = 'force-dynamic';
// Top-up receipt + approve receipt + allowance loop + burn receipt can span
// a couple of minutes on Base — the platform default timeout would kill the
// function mid-burn (the tx would still land; the row patch would not).
export const maxDuration = 300;

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!autopilotEnabled()) {
      return NextResponse.json({ success: false, error: 'autopilot-disabled' }, { status: 409 });
    }
    const { transferId } = await request.json();
    if (typeof transferId !== 'string' || !transferId) {
      return NextResponse.json({ success: false, error: 'Missing transferId' }, { status: 400 });
    }

    const tr = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
    if (!tr || tr.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    // Doc 93 0b: REFUND rows (pure USDC→USDC returns) have no source-swap
    // leg by construction — srcSwapTxHash is only required for real inbound
    // swaps. The custody pin below still verifies the recipient.
    const isPureUsdcReturn = tr.srcAsset === 'USDC' && tr.dstAsset === 'USDC';
    if (
      tr.direction !== 'crosschain_to_stellar' ||
      (!tr.srcSwapTxHash && !isPureUsdcReturn) ||
      tr.burnTxHash ||
      tr.status === 'COMPLETED' ||
      tr.status === 'FAILED' ||
      tr.status === 'REFUNDED'
    ) {
      return NextResponse.json({ success: false, error: 'Not burnable' }, { status: 409 });
    }

    // The signer address must be the user's OWN Turnkey EVM address — cross-
    // checked against their wallet row, not trusted from the transfer alone.
    // Case-insensitive: EVM hex addresses may be stored checksummed or not.
    const wallet = await prisma.turnkeyWallet.findFirst({ where: { supabaseUid: user.id } });
    if (
      !wallet?.subOrgId ||
      !wallet.ethereumAddress ||
      wallet.ethereumAddress.toLowerCase() !== tr.srcAddress.toLowerCase()
    ) {
      return NextResponse.json({ success: false, error: 'Wallet mismatch' }, { status: 409 });
    }

    // CUSTODY PIN (scenario sweep 2026-08-21): the burn's hookData recipient
    // comes from the row, and the row's destAddress is CLIENT-supplied at
    // creation with no ownership check. The Turnkey policy cannot see inside
    // hookData — so the server must refuse recipients the user doesn't own
    // (their Turnkey Stellar wallet or a linked wallet). Without this, a
    // stolen SESSION could create a row pointing at an attacker G-address
    // and have the autopilot burn in-flight USDC to it — the first
    // session-only money path in the app. Refusal falls back to the
    // interactive burn, which requires the passkey.
    if (!(await userOwnsWallet(user.id, tr.destAddress))) {
      return NextResponse.json(
        { success: false, error: 'Recipient is not one of your wallets' },
        { status: 409 }
      );
    }

    // Burn whatever actually landed (mirrors the banner's recover()).
    const { http, erc20Abi, createPublicClient } = await import('viem');
    const { base, baseSepolia } = await import('viem/chains');
    const network = tr.network === 'mainnet' ? 'mainnet' : 'testnet';
    const client = createPublicClient({
      chain: network === 'mainnet' ? base : baseSepolia,
      transport: http(),
    });
    const { EVM_USDC } = await import('@/lib/cctp/config');
    const bal = await client.readContract({
      address: EVM_USDC.base[network],
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [tr.srcAddress as `0x${string}`],
    });
    if (bal === 0n) {
      return NextResponse.json({ success: false, error: 'No USDC on Base yet' }, { status: 409 });
    }
    // Doc 95 Wave 3 (live 2026-08-26): this used to burn the WHOLE balance,
    // so when two swaps landed together one row's burn swept the other's
    // minted USDC and orphaned it. Take only this row's share.
    const burnWire = scopedAmountWire(bal as bigint, BigInt(tr.amountWire));
    if (burnWire === 0n) {
      return NextResponse.json({ success: false, error: 'No USDC on Base yet' }, { status: 409 });
    }

    // Dust gas for the approve + burn — same locked core as /api/cctp/gas-topup
    // (fresh Base wallets hold zero ETH; the relayer fronts it, priced into the
    // quote). Server-side we can wait for the actual receipt instead of the
    // banner's fixed sleep, so the burn's gas estimate never races the top-up.
    const gas = await ensureTransferGas(tr.id);
    if (gas.outcome === 'sent') {
      await client.waitForTransactionReceipt({ hash: gas.txHash });
    } else if (gas.outcome === 'in-progress') {
      // Another actor (banner tap, retried call) is funding right now — give
      // its send a moment to land; the burn below fails loudly if it didn't.
      await new Promise((r) => {
        setTimeout(r, 6000);
      });
    } else if (gas.outcome === 'failed') {
      return NextResponse.json({ success: false, error: 'Gas top-up failed' }, { status: 502 });
    } else if (gas.outcome === 'invalid') {
      // e.g. the burn landed between our check and now — nothing left to do.
      return NextResponse.json({ success: false, error: 'Not burnable' }, { status: 409 });
    }

    const { burnTxHash } = await autopilotBurnUsdc({
      network,
      chain: 'base',
      subOrgId: wallet.subOrgId,
      evmAddress: tr.srcAddress,
      amountWire: burnWire,
      stellarRecipient: tr.destAddress,
      // Doc 95 Wave 3: persist the hash the moment it is broadcast. A
      // receipt-wait failure used to discard a real burn, after which the
      // engine signed a SECOND one.
      onBroadcast: async (hash, label) => {
        if (label !== 'depositForBurnWithHook') return;
        await prisma.cctpTransfer
          .updateMany({
            where: { id: tr.id, burnTxHash: null },
            data: { burnTxHash: hash, status: 'BURN_SUBMITTED' },
          })
          .catch(() => {});
      },
    });

    // Mirror the PATCH route exactly: the hash lands ONCE, and the status flip
    // to BURN_SUBMITTED is what puts the row inside PENDING_STATUSES so the
    // cron advances the bridge — without it the transfer would sit in CREATED
    // forever. Guarded on burnTxHash null so a racing writer can't be clobbered.
    await prisma.cctpTransfer.updateMany({
      where: { id: tr.id, burnTxHash: null },
      data: {
        burnTxHash,
        status: 'BURN_SUBMITTED',
        ...(tr.dstAmount ? {} : { dstAmount: wireToUsdc(burnWire) }),
      },
    });

    return NextResponse.json({ success: true, burnTxHash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message ?? e) }, { status: 502 });
  }
});
