import type { Metadata } from 'next';

import PrivacyPolicyView from '@/sections/legal/pp-view';

export const metadata: Metadata = {
  title: 'Normal | Legal - Privacy Policy',
  description: '',
};

export default function Page() {
  return <PrivacyPolicyView />;
}
