'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { UserSettingsView } from '@/sections/settings';

export default function SettingsPage() {
  const { session, isLoading } = useSupabaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/');
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return null; // Should be a skeleton loader here
  }

  return <UserSettingsView />;
}
