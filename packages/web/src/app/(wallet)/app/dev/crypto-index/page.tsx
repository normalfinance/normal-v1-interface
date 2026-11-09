import { notFound } from 'next/navigation';
import { CryptoIndexView } from '@/sections/crypto-index';

// ----------------------------------------------------------------------

// The crypto index page without its flag, for looking at it while building
// (the real /app/crypto-index answers 404 until NEXT_PUBLIC_INDEX_ENABLED is
// set). Development only: a production build answers 404.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <CryptoIndexView />;
}
