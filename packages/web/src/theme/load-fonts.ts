import '@fontsource/figtree/300.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';

import localFont from 'next/font/local';

export const circularStd = localFont({
  variable: '--font-circular',
  display: 'swap',
  src: [
    { path: '../../public/fonts/CircularStd-Book.otf', weight: '400' },
    { path: '../../public/fonts/CircularStd-Medium.otf', weight: '500' },
    { path: '../../public/fonts/CircularStd-Bold.otf', weight: '700' },
    { path: '../../public/fonts/CircularStd-Black.otf', weight: '900' },
  ],
});
