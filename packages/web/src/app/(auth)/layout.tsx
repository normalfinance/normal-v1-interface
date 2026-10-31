import type { ReactNode } from 'react';

import { AuthView } from '@/sections/auth/auth-view';

// The form lives in this shared layout, not in the two pages, so moving between
// /login and /signup is instant and keeps the finished bot check. The pages exist
// to give each mode its own URL and title.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthView />
      {children}
    </>
  );
}
