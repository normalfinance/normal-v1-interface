import '@/global.css';

import type { Metadata, Viewport } from 'next';

import { CONFIG } from '@/global-config';
import { primary } from '@/theme/core/palette';
import { LocalizationProvider } from '@/locales';
import { detectLanguage } from '@/locales/server';
import { Analytics } from '@vercel/analytics/next';
import { themeConfig, ThemeProvider } from '@/theme';
import { DashboardLayout } from '@/layouts/dashboard';
import { I18nProvider } from '@/locales/i18n-provider';
import { ModalProvider } from '@/providers/ModalProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ReferralProvider } from '@/providers/ReferralProvider';
import { AssetActionsProvider } from '@/providers/AssetActionsProvider';
import { AnnouncementProvider } from '@/providers/AnnouncementProvider';
import { SupabaseAuthProvider } from '@/providers/SupabaseAuthProvider';
import { WalletPasswordProvider } from '@/providers/WalletPasswordProvider';

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
  themeColor: primary.main,
};

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  title: {
    default: 'Normal',
    template: '%s · Normal',
  },
  description:
    'Earn yield on your USDC with Normal — self-custody savings powered by DeFindex and Blend on Stellar.',
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
        {/* Non-blocking font load — does not delay first paint */}
        <link
          rel="preload"
          as="style"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
          media="print"
          // @ts-expect-error — onLoad on link is valid HTML but not in React types
          onLoad="this.media='all'"
        />
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
                  <SupabaseAuthProvider>
                    <ReferralProvider>
                      <MotionLazy>
                        <SnackbarProvider>
                          <Analytics />
                          {/* Collect-only real-user performance vitals (Phase 0
                                  baseline — approved 2026-07-24). */}
                          <SpeedInsights />
                          <ProgressBar />
                          <SettingsDrawer defaultSettings={defaultSettings} />
                          <AnnouncementProvider>
                            <WalletPasswordProvider>
                              <ModalProvider>
                                <AssetActionsProvider>
                                  <DashboardLayout>{children}</DashboardLayout>
                                </AssetActionsProvider>
                              </ModalProvider>
                            </WalletPasswordProvider>
                          </AnnouncementProvider>
                        </SnackbarProvider>
                      </MotionLazy>
                    </ReferralProvider>
                  </SupabaseAuthProvider>
                </ThemeProvider>
              </AppRouterCacheProvider>
            </LocalizationProvider>
          </SettingsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
