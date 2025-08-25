// components/_async/logo-loader.tsx
'use client';

import * as React from 'react';
import Box, { BoxProps } from '@mui/material/Box';
import { useTheme, alpha } from '@mui/material/styles';
import { keyframes } from '@mui/system';

export type LogoLoaderProps = BoxProps & {
  size?: number;
  speed?: number;
  fullScreen?: boolean;
  zIndex?: number;
};

const breathe = keyframes`
  0%, 100% { transform: scale(0.98); }
  50% { transform: scale(1.05); }
`;

export function LogoLoader({
  size = 320,
  speed = 1.6,
  fullScreen = false,
  zIndex,
  sx,
  ...props
}: LogoLoaderProps) {
  const theme = useTheme();
  const id = React.useId().replace(/:/g, '');
  const gradId = `nf-grad-${id}`;
  const logoH = Math.round((size * 150) / 700);

  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;

  return (
    <Box
      sx={{
        ...(fullScreen
          ? {
              position: 'fixed',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              zIndex: zIndex ?? theme.zIndex.modal + 2,
              bgcolor: 'background.default',
            }
          : {}),
        ...sx,
      }}
      {...props}
    >
      <Box sx={{ position: 'relative', width: size, height: logoH }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            zIndex: 1,
            transformOrigin: '50% 50%',
            animation: `${breathe} ${speed}s ease-in-out infinite`,
          }}
        >
          <Box sx={{ width: size, height: 'auto' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
              viewBox="0 0 700 150"
              role="img"
              aria-label="Loading"
            >
              <defs>
                <linearGradient
                  id={gradId}
                  x1="31.5"
                  y1="75"
                  x2="668.5"
                  y2="75"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#75ffff" />
                  <stop offset=".03" stopColor="#62f2fd" />
                  <stop offset=".13" stopColor="#2dcdfa" />
                  <stop offset=".21" stopColor="#0cb7f7" />
                  <stop offset=".25" stopColor="#00aff7" />
                  <stop offset=".31" stopColor="#23a2f8" />
                  <stop offset=".5" stopColor="#947bff" />
                  <stop offset=".57" stopColor="#bc58d6" />
                  <stop offset=".65" stopColor="#dd3db6" />
                  <stop offset=".71" stopColor="#f02ca3" />
                  <stop offset=".75" stopColor="#f8279c" />
                  <stop offset=".78" stopColor="#f95882" />
                  <stop offset=".82" stopColor="#fb816d" />
                  <stop offset=".85" stopColor="#fca45c" />
                  <stop offset=".89" stopColor="#fdbe4e" />
                  <stop offset=".92" stopColor="#fed144" />
                  <stop offset=".96" stopColor="#fedd3e" />
                  <stop offset="1" stopColor="#ffe13d" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#${gradId})`}
                d="M188.53,19.91c-30.56,0-55.34,24.78-55.34,55.34s24.78,55.34,55.34,55.34,55.34-24.78,55.34-55.34-24.78-55.34-55.34-55.34Zm275.47,.19h0c-6.39,0-12.63,2.35-17.17,6.84-4.89,4.84-11.61,7.83-19.03,7.83s-14.14-2.99-19.03-7.83c-4.54-4.49-10.78-6.84-17.17-6.84h0c-10.38,0-18.8,8.42-18.8,18.8V103.7c0,15.19,12.31,27.5,27.5,27.5h0c15.19,0,27.5-12.31,27.5-27.5,0,15.19,12.31,27.5,27.5,27.5h0c15.19,0,27.5-12.31,27.5-27.5V38.9c0-10.38-8.42-18.8-18.8-18.8Zm83.27,.06h0c-30.38,0-55,24.62-55,55h0c0,30.38,24.62,55,55,55h55v-55c0-30.38-24.62-55-55-55Zm111.44,.19h-37.19c-5.41,0-9.79,4.38-9.79,9.79V120.56c0,5.41,4.38,9.79,9.79,9.79h37.19c5.41,0,9.79-4.38,9.79-9.79V30.13c0-5.41-4.38-9.79-9.79-9.79Zm-350.38-1.54h0c-30.38,0-55,24.62-55,55h0v49.95c0,3.81,3.09,6.9,6.9,6.9h43.05c3.81,0,6.9-3.09,6.9-6.9v-49.95h53.15c0-30.38-24.62-55-55-55ZM123.72,130.59H31.5V64.91c0-25.47,20.64-46.11,46.11-46.11h0c25.47,0,46.11,20.64,46.11,46.11v65.68Z"
              />
            </svg>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
