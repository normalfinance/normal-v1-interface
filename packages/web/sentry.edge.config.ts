import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: process.env.NEXT_PUBLIC_APP_VERSION
    ? `@normalfinance/web@${process.env.NEXT_PUBLIC_APP_VERSION}`
    : undefined,
  tracesSampleRate: 1,
  debug: false,
  sendDefaultPii: true,
});
