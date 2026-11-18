import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/app/min-version — the oldest app build the server still supports.
//
// 200 { ios: number, android: number }
//
// Installed apps can't be force-updated, so a change old builds can't handle
// (2FA was the first) needs a way to ask them to update. The app reads this on
// launch and when it returns to the foreground, and shows "Update Normal" when
// its own build number is lower: iOS CFBundleVersion, Android versionCode.
// Build numbers, not marketing versions, because two builds can share "1.0.0".
//
// Public on purpose: an old build has to reach it before anyone signs in.
// APP_MIN_BUILD_IOS / APP_MIN_BUILD_ANDROID set the floors. Unset means 0, which
// blocks nothing, and so does a value that isn't a whole number: a typo must not
// lock every installed app out.
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

function minBuild(name: string, value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 0;
  const build = Number(value);
  if (Number.isInteger(build) && build >= 0) return build;
  logger.error(`[min-version] ${name} is not a whole number, so no build is blocked`, { value });
  return 0;
}

export function GET() {
  return NextResponse.json(
    {
      ios: minBuild('APP_MIN_BUILD_IOS', process.env.APP_MIN_BUILD_IOS),
      android: minBuild('APP_MIN_BUILD_ANDROID', process.env.APP_MIN_BUILD_ANDROID),
    },
    // Short, so raising the floor reaches every app within a minute of the deploy.
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } }
  );
}
