import type { Sep24SingleResponse } from '@/lib/mgi/types';

import { NextResponse } from 'next/server';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  // TODO: Complete API call to MGI
  const txs: any[] = [];

  const tx = txs.find((t) => t.id === params.id);
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body: Sep24SingleResponse = { transaction: tx };
  return NextResponse.json(body, { status: 200 });
}
