import type { Metadata } from 'next';

import TermsOfServiceView from '@/sections/legal/tos-view';

export const metadata: Metadata = {
  title: 'Normal | Legal - Terms of Service',
  description: '',
};

export default function Page() {
  return <TermsOfServiceView />;
}
