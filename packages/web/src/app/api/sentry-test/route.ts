import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  throw new Error('Sentry Test API Error');
  //the line below will never be reached, but it's here to satisfy TypeScript.
  return NextResponse.json({ message: 'This should not be returned.' });
}
