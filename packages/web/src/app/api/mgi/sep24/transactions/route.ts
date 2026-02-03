import type { Sep24ListResponse } from '@/lib/mgi/types';

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Optional: filter by kind/status/account via query params if you want
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind'); // 'deposit' | 'withdrawal'
  const status = searchParams.get('status');
  const account = searchParams.get('account');

  // TODO: Complete API call to MGI
  let tx: any[] = [];

  if (kind) tx = tx.filter((t) => t.kind === kind);
  if (status) tx = tx.filter((t) => t.status === status);
  if (account) {
    tx = tx.filter((t) => t.from === account || t.to === account);
  }

  const body: Sep24ListResponse = { transactions: tx };
  return NextResponse.json(body, { status: 200 });
}
