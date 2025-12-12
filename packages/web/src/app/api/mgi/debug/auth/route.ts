import { NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';

export async function GET() {
  try {
    const sec = process.env.AUTH_SECRET_KEY || '';
    const pubFromSecret = sec ? Keypair.fromSecret(sec).publicKey() : '(no AUTH_SECRET_KEY)';
    return NextResponse.json({
      server_AUTH_PUBLIC_FROM_SECRET: pubFromSecret,
      env_AUTH_PUBLIC_KEY: process.env.AUTH_PUBLIC_KEY || '(unset)',
      client_domain: process.env.CLIENT_DOMAIN || '(unset)',
      mgi_host: process.env.MGI_ACCESS_HOST || '(unset)',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
