import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { View500 } from 'src/sections/error';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `500 Internal server error! | Error - ${CONFIG.appName}`,
};

export default function Page() {
  return <View500 />;
}
