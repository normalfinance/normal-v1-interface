import '@/global.css';

import type { Metadata, Viewport } from 'next';

import { CONFIG } from '@/global-config';
import { LocalizationProvider } from '@/locales';
import { detectLanguage } from '@/locales/server';
import { Analytics } from '@vercel/analytics/next';
import { themeConfig, ThemeProvider } from '@/theme';
import { I18nProvider } from '@/locales/i18n-provider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE_THEME_CSS, SITE_THEME_INIT } from '@/theme/site-theme';
import { AnnouncementProvider } from '@/providers/AnnouncementProvider';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

import { ProgressBar } from '@/components/template/progress-bar';
import { SnackbarProvider } from '@/components/template/snackbar';
import { MotionLazy } from '@/components/template/animate/motion-lazy';
import { detectSettings } from '@/components/template/settings/server';
import { SettingsDrawer, defaultSettings, SettingsProvider } from '@/components/template/settings';

// ----------------------------------------------------------------------

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The browser bar matches the white headers of both sites.
  themeColor: '#FFFFFF',
};

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  title: {
    default: 'Normal',
    template: '%s · Normal',
  },
  description:
    'Earn yield on your USDC with Normal: self-custody savings powered by DeFindex and Blend on Stellar.',
  keywords: 'crypto savings, USDC yield, DeFi, Stellar, Blend, DeFindex, Normal Finance',
  openGraph: {
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/home.png'],
  },
  manifest: '/manifest.json',
  icons: [
    {
      rel: 'icon',
      url: '/favicon.ico',
    },
  ],
};

// ----------------------------------------------------------------------

type RootLayoutProps = {
  children: React.ReactNode;
};

async function getAppConfig() {
  if (CONFIG.isStaticExport) {
    return {
      lang: 'en',
      i18nLang: undefined,
      cookieSettings: undefined,
      dir: defaultSettings.direction,
    };
  } else {
    const [lang, settings] = await Promise.all([detectLanguage(), detectSettings()]);

    return {
      lang: lang ?? 'en',
      i18nLang: lang ?? 'en',
      cookieSettings: settings,
      dir: settings.direction,
    };
  }
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const appConfig = await getAppConfig();

  return (
    <html lang={appConfig.lang} dir={appConfig.dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        {/* Font stylesheet. The old media="print" + onLoad="this.media='all'"
            async trick was written for raw HTML — React refuses string event
            handlers (the console warning on every page load) and never
            attached it, so the trick was dead weight. A plain link with
            display=swap gives the same no-invisible-text behavior. */}
        <link
          rel="preload"
          as="style"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
        {/* The colour tokens for both modes, and the marketing site's light/dark
            choice applied before the first paint (theme/site-theme.ts). */}
        <style id="nf-theme" dangerouslySetInnerHTML={{ __html: SITE_THEME_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: SITE_THEME_INIT }} />
      </head>
      <body>
        <InitColorSchemeScript
          defaultMode={themeConfig.defaultMode}
          modeStorageKey={themeConfig.modeStorageKey}
          attribute={themeConfig.cssVariables.colorSchemeSelector}
        />

        <I18nProvider lang={appConfig.i18nLang}>
          <SettingsProvider
            cookieSettings={appConfig.cookieSettings}
            defaultSettings={defaultSettings}
          >
            <LocalizationProvider>
              <AppRouterCacheProvider options={{ key: 'css' }}>
                <ThemeProvider
                  defaultMode={themeConfig.defaultMode}
                  modeStorageKey={themeConfig.modeStorageKey}
                >
                  {/* Everything both sites share. The marketing site (app/(site))
                      and the app (app/(wallet)) each bring their own frame; the
                      auth and wallet providers live in the app's, so a visitor
                      reading the home page never downloads the wallet. Referral
                      links are captured by the site frame (ReferralCapture) and
                      tracked by the app (ReferralProvider). */}
                  <MotionLazy>
                    <SnackbarProvider>
                      <Analytics />
                      {/* Collect-only real-user performance vitals (Phase 0
                                baseline — approved 2026-07-24). */}
                      <SpeedInsights />
                      <ProgressBar />
                      <SettingsDrawer defaultSettings={defaultSettings} />
                      <AnnouncementProvider>{children}</AnnouncementProvider>
                    </SnackbarProvider>
                  </MotionLazy>
                </ThemeProvider>
              </AppRouterCacheProvider>
            </LocalizationProvider>
          </SettingsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
