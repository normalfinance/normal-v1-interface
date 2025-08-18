'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePersistStore } from '@normalfinance/state';

const URL_INVITE_CODE_KEY = 'normal_url_invite_code';

export function useUrlInviteCode() {
  const searchParams = useSearchParams();
  const setUrlInviteCode = usePersistStore((s) => s.setUrlInviteCode);
  const urlInviteCode = usePersistStore((s) => s.inviteCode.urlInviteCode);

  useEffect(() => {
    console.log('[invite-debug] useUrlInviteCode effect running');

    // First, check if there's a code in localStorage from previous visit
    const storedCode = localStorage.getItem(URL_INVITE_CODE_KEY);
    console.log('[invite-debug] Stored code from localStorage:', storedCode);

    if (storedCode && !urlInviteCode) {
      console.log('[invite-debug] Setting stored code to state:', storedCode);
      setUrlInviteCode(storedCode);
    }

    // Then check URL parameters
    const inviteParam = searchParams.get('invite');
    console.log('[invite-debug] URL invite param:', inviteParam);

    if (inviteParam) {
      // Validate invite code format (NF + 6 hex chars)
      const isValidFormat = /^NF[A-F0-9]{6}$/i.test(inviteParam);
      console.log('[invite-debug] Is valid format:', isValidFormat);

      if (isValidFormat) {
        const upperCaseCode = inviteParam.toUpperCase();
        console.log('[invite-debug] Setting URL code to state:', upperCaseCode);
        setUrlInviteCode(upperCaseCode);
        // Persist to localStorage so it survives refreshes
        localStorage.setItem(URL_INVITE_CODE_KEY, upperCaseCode);
      }
    }
  }, [searchParams, setUrlInviteCode, urlInviteCode]);

  // Clean up localStorage when invite code is accepted
  useEffect(() => {
    const inviteCodeState = usePersistStore.getState().inviteCode;
    if (inviteCodeState.hasValidCode) {
      localStorage.removeItem(URL_INVITE_CODE_KEY);
    }
  }, []);

  return urlInviteCode;
}
