import CreateAnIndexView from '@/sections/create-an-index';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Normal | Create an Index',
  description: '',
};

export default function Page() {
  return <CreateAnIndexView />;
}
