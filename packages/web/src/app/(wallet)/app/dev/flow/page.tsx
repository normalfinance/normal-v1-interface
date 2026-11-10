import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import FlowPreview from '@/sections/dev/flow-preview';

// ----------------------------------------------------------------------

// The money-movement review page with sample data, for looking at every state
// while building it. Development only: a production build answers 404.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <Suspense>
      <FlowPreview />
    </Suspense>
  );
}
