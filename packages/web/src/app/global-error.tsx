'use client';

// Error boundaries must be Client Components

import NextError from 'next/error';

export default function GlobalError({
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    // global-error must include html and body tags
    <html>
      <body>
        {/* `NextError` is the default Next.js error page component */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
