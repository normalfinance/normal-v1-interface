'use client';

import { useEffect } from 'react';

// ----------------------------------------------------------------------

// The marketing site's half of referral tracking. A visitor who lands on
// `/?ref=CODE` gets the same cookies the full tracker writes and reads back
// (useReferralTracking, mounted with the app's providers), so the code survives
// the trip to sign-up without the wallet store loading on a marketing page. The
// first code wins, as in the full tracker. Keep the names and format in step
// with packages/state/src/state/persist/createReferralActions.ts.
const CODE_COOKIE = 'referral_code';
const TIMESTAMP_COOKIE = 'referral_timestamp';
const MAX_DAYS = 30;

export function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref') || params.get('referral') || params.get('referrer');
    if (!code) return;

    const alreadyReferred = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith(`${CODE_COOKIE}=`));
    if (alreadyReferred) return;

    const now = Date.now();
    const expires = new Date(now + MAX_DAYS * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${CODE_COOKIE}=${code};expires=${expires};path=/;SameSite=lax`;
    document.cookie = `${TIMESTAMP_COOKIE}=${now};expires=${expires};path=/;SameSite=lax`;

    try {
      localStorage.setItem('referral_used', 'false');
      localStorage.setItem('referral_used_actions', '[]');
    } catch {
      // Storage blocked (private mode, policy): the cookies still carry the code.
    }
  }, []);

  return null;
}
