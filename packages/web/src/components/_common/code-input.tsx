'use client';

import type { Theme } from '@mui/material/styles';

import { useTranslate } from '@/locales';
import { useRef, useState, useEffect } from 'react';
import {
  INK,
  PAPER,
  DANGER as ERROR,
  HAIRLINE_STRONG as STRONG_HAIRLINE,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';

import { MONO_FONT } from './brand';

// Keys that would move the caret off the end, where typing must always land.
const CARET_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

type CodeInputProps = {
  value: string;
  onChange: (digits: string) => void;
  /** Runs when the last digit goes in, so the code submits by itself. */
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  /** Smaller boxes, for a dialog or a settings card. */
  size?: 'medium' | 'small';
  /** What a screen reader announces. Defaults to "6-digit code". */
  label?: string;
};

// A one-time code as a row of boxes, split in the middle the way an
// authenticator app shows it ("123 456"). One real input sits invisibly on top,
// so typing, pasting, the phone's number pad and "fill from Messages" all work
// as they do in a plain field.
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = false,
  size = 'medium',
  label,
}: CodeInputProps) {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // A disabled input drops focus, so after a wrong code the boxes would sit
  // there unfocused. Take it back as soon as they're usable again.
  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus();
  }, [autoFocus, disabled]);

  const keepCaretAtEnd = () => {
    const input = inputRef.current;
    if (input) input.setSelectionRange(input.value.length, input.value.length);
  };

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    if (digits === value) return;
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  const small = size === 'small';
  const half = Math.ceil(length / 2);
  const activeIndex = Math.min(value.length, length - 1);

  const renderBox = (index: number) => {
    const digit = value[index] ?? '';
    const active = focused && !disabled && index === activeIndex;
    const showCaret = active && !digit;

    return (
      <Box
        key={index}
        sx={(theme: Theme) => ({
          flex: 1,
          minWidth: 0,
          height: small ? 48 : 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: PAPER,
          border: `1px solid ${STRONG_HAIRLINE}`,
          borderRadius: 'var(--radius-md)',
          fontFamily: MONO_FONT,
          fontSize: small ? 20 : 24,
          fontWeight: 500,
          color: INK,
          transition: 'border-color 150ms',
          ...(active && {
            borderColor: INK,
            outline: '3px solid rgba(10,10,15,0.06)',
          }),
          ...(error && {
            borderColor: ERROR,
            outline: '3px solid rgba(185,28,28,0.08)',
          }),
        })}
      >
        {digit}
        {showCaret && (
          <Box
            sx={{
              width: '1.5px',
              height: small ? 20 : 24,
              bgcolor: 'currentColor',
              animation: 'code-input-caret 1s step-end infinite',
              '@keyframes code-input-caret': { '50%': { opacity: 0 } },
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: small ? 360 : 400,
        opacity: disabled ? 0.55 : 1,
        transition: 'opacity 150ms',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{ display: 'flex', alignItems: 'center', gap: { xs: '6px', sm: '8px' } }}
      >
        {Array.from({ length: half }, (_, index) => renderBox(index))}
        <Box
          sx={{
            width: 10,
            height: '2px',
            flexShrink: 0,
            mx: { xs: '2px', sm: '4px' },
            bgcolor: STRONG_HAIRLINE,
            borderRadius: 'var(--radius-xs)',
          }}
        />
        {Array.from({ length: length - half }, (_, index) => renderBox(half + index))}
      </Box>

      <input
        ref={inputRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => {
          setFocused(true);
          keepCaretAtEnd();
        }}
        onBlur={() => setFocused(false)}
        onMouseUp={keepCaretAtEnd}
        onKeyDown={(event) => {
          if (CARET_KEYS.includes(event.key)) event.preventDefault();
        }}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={length}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        spellCheck={false}
        aria-label={label ?? t('6-digit code')}
        aria-invalid={error || undefined}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          border: 0,
          opacity: 0,
          // 16px keeps iOS from zooming the page when the field takes focus.
          fontSize: 16,
          cursor: disabled ? 'default' : 'text',
        }}
      />
    </Box>
  );
}
