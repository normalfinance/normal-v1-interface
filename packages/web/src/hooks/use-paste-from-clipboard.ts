'use client';

import { useState } from 'react';

// ----------------------------------------------------------------------

type PastedValue = string | null;

type PasteFn = () => Promise<string>;

type ReturnType = {
  paste: PasteFn;
  pastedText: PastedValue;
};

export function usePasteFromClipboard(): ReturnType {
  const [pastedText, setPastedText] = useState<PastedValue>(null);

  const paste: PasteFn = async () => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return '';
    }

    // Try to save to clipboard then save it in the state if worked
    try {
      const text = await navigator.clipboard.readText();
      setPastedText(text);
      return text;
    } catch (error) {
      console.warn('Paste failed', error);
      setPastedText(null);
      return '';
    }
  };

  return { pastedText, paste };
}
