import { NextResponse } from 'next/server';
import { Wallet } from '@stellar/typescript-wallet-sdk';

export async function POST(req: Request) {
  try {
    const { token, account, amount } = (await req.json()) as {
      token?: string;
      account?: string;
      amount?: string | number;
    };
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    if (!account) {
      return NextResponse.json({ error: 'Missing account' }, { status: 400 });
    }

    const homeDomain = process.env.MGI_ACCESS_HOST; // e.g. "extstellar.moneygram.com" or "stellar.moneygram.com"
    if (!homeDomain) {
      return NextResponse.json({ error: 'Server missing MGI_ACCESS_HOST' }, { status: 500 });
    }

    const wallet = Wallet.TestNet(); // Use Wallet.Public() for MoneyGram production env
    const anchor = wallet.anchor({ homeDomain });

    // Fetch anchor info for asset details
    const info = await anchor.getInfo();
    const currency = info.currencies.find(({ code }) => code === 'USDC');
    if (!currency?.issuer) {
      throw new Error('Anchor does not support USDC asset or issuer not found');
    }

    // Prepare withdrawal request parameters
    const withdrawParams: any = {
      authToken: token as any, // Bearer token from SEP-10 auth
      assetCode: 'USDC',
      assetIssuer: currency.issuer, // USDC issuer on the network:contentReference[oaicite:8]{index=8}
      withdrawalAccount: account, // Source account for withdrawal (must match SEP-10 auth account for non-custodial):contentReference[oaicite:9]{index=9}
      lang: 'en',
    };
    if (amount) {
      // Include amount if specified (optional for non-custodial, required for custodial):contentReference[oaicite:10]{index=10}
      withdrawParams.extraFields = { amount: String(amount) };
    }

    // Initiate interactive withdrawal transaction
    const { url, id } = await anchor.sep24().withdraw(withdrawParams);
    if (!url) {
      return NextResponse.json(
        { error: 'MoneyGram did not return an interactive URL', details: { id: id ?? null } },
        { status: 502 }
      );
    }
    // Return the interactive web URL and transaction ID
    return NextResponse.json({ url, id: id ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Server error', stack: e?.stack },
      { status: 500 }
    );
  }
}
