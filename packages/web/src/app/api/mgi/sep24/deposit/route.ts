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

    const homeDomain = process.env.MGI_ACCESS_HOST; // e.g. "extstellar.moneygram.com" for Sandbox
    if (!homeDomain) {
      return NextResponse.json({ error: 'Server missing MGI_ACCESS_HOST' }, { status: 500 });
    }

    // Use Stellar Testnet or Public network based on environment
    const wallet = Wallet.TestNet(); // Use Wallet.Public() if targeting mainnet
    const anchor = wallet.anchor({ homeDomain });

    // Fetch anchor info to get asset issuer and supported currencies
    const info = await anchor.getInfo();
    const currency = info.currencies.find(({ code }) => code === 'USDC');
    if (!currency?.issuer) {
      throw new Error('Anchor does not support USDC asset or issuer not found');
    }

    // Prepare deposit request parameters
    const depositParams: any = {
      authToken: token as any, // Bearer token from SEP-10 auth
      assetCode: 'USDC', // Asset code to deposit
      assetIssuer: currency.issuer, // USDC asset issuer (from anchor info):contentReference[oaicite:5]{index=5}
      account: account, // Destination account for deposit:contentReference[oaicite:6]{index=6}
      lang: 'en',
    };
    if (amount) {
      // Include amount if specified (optional for non-custodial, required for custodial):contentReference[oaicite:7]{index=7}
      depositParams.extraFields = { amount: String(amount) };
    }

    // Initiate interactive deposit transaction
    const { url, id } = await anchor.sep24().deposit(depositParams);
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
