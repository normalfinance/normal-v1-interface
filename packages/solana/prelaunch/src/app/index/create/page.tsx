import type { Metadata } from 'next';

import CreateAnIndexView from '@/sections/create-an-index';

export const metadata: Metadata = {
  title: 'Normal | Create an Index',
  description: '',
};

export default function Page() {
  return <CreateAnIndexView />;
}
