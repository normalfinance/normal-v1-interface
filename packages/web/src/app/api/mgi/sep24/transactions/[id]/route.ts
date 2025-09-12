import { NextResponse } from 'next/server';
import type { Sep24SingleResponse } from '@/lib/mgi/types';
import { MOCK_TX } from '@/lib/mgi/mock/transactions';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const tx = MOCK_TX.find((t) => t.id === params.id);
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body: Sep24SingleResponse = { transaction: tx };
  return NextResponse.json(body, { status: 200 });
}
