'use client';

import { useState } from 'react';
import { logger } from '@normalfinance/utils';

// ----------------------------------------------------------------------

type CopiedValue = string | null;

type CopyFn = (text: string) => Promise<boolean>;

type ReturnType = {
  copy: CopyFn;
  copiedText: CopiedValue;
};

export function useCopyToClipboard(): ReturnType {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null);

  const copy: CopyFn = async (text) => {
    // Primary: Clipboard API (requires HTTPS / user gesture)
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        return true;
      } catch (error) {
        logger.warn('Clipboard API failed, trying execCommand fallback', error);
      }
    }

    // Fallback: execCommand (works on HTTP, older browsers, some mobile)
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      if (ok) {
        setCopiedText(text);
        return true;
      }
    } catch (error) {
      logger.warn('execCommand copy failed', error);
    }

    setCopiedText(null);
    return false;
  };

  return { copiedText, copy };
}
