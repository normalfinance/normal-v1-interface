'use client';

import { Suspense } from 'react';

import { AuthForm } from './auth-form';
import { AuthShell } from './auth-shell';

export function AuthView() {
  return (
    <AuthShell>
      {/* Reads the URL's `next`, so it renders in the browser. The logo and
          image around it are in the first paint. */}
      <Suspense fallback={null}>
        <AuthForm />
      </Suspense>
    </AuthShell>
  );
}
