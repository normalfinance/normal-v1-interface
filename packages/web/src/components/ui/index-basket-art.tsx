'use client';

import * as React from 'react';
import { m, domMax, LazyMotion } from 'framer-motion';

type Props = { style?: React.CSSProperties; className?: string };

// Timing
const DURATION = 4.6; // seconds per loop
const UP_START_T = 0.72; // when all coins begin rising together
const STAGGER_STEP = 0.05; // delay
const FALL_FRAC = 0.22; // fall duration

// Arc amounts
const DOWN = { BTC: 84, DOGE: 110, XRP: 118, ADA: 169, ETH: 138 };
const SIDE = { BTC: -8, DOGE: 20, XRP: -38, ADA: -32, ETH: 5 };

// - it waits until t0
// - then falls until t1,
// - then waits at bottom until UP_START_T,
// - then rises to top by t=1,
// - loops.
function buildKeyframes(t0: number, downY: number, sideX: number) {
  // Ensure last coin still has at least a tiny dwell before UP_START_T
  const t1 = Math.min(t0 + FALL_FRAC, UP_START_T - 0.04);

  // Y keyframes: start (0), fall (down), wait (down), up (0)
  const y = [0, downY, downY, 0];
  const x = [0, sideX, sideX, 0];

  // Times must be non-decreasing, within [0,1]
  const times = [Math.max(0, t0), Math.max(0, t1), UP_START_T, 1];

  return { x, y, times };
}

const coins = [
  { id: 'BTC', t0: 0 * STAGGER_STEP, down: DOWN.BTC, side: SIDE.BTC },
  { id: 'DOGE', t0: 1 * STAGGER_STEP, down: DOWN.DOGE, side: SIDE.DOGE },
  { id: 'XRP', t0: 2 * STAGGER_STEP, down: DOWN.XRP, side: SIDE.XRP },
  { id: 'ADA', t0: 3 * STAGGER_STEP, down: DOWN.ADA, side: SIDE.ADA },
  { id: 'ETH', t0: 4 * STAGGER_STEP, down: DOWN.ETH, side: SIDE.ETH },
];

export default function IndexBasketArt({ style, className }: Props) {
  return (
    <LazyMotion features={domMax}>
      <m.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 271 303"
        width="100%"
        height="auto"
        preserveAspectRatio="xMidYMid meet"
        style={style}
        className={className}
      >
        <defs>
          <clipPath clipPathUnits="userSpaceOnUse" id="cp1">
            <path d="m271 168c0 35.8-14.28 70.14-39.69 95.46-25.41 25.32-59.87 39.54-95.81 39.54-35.94 0-70.4-14.22-95.81-39.54-25.41-25.32-39.69-59.66-39.69-95.46h19.04c0 30.77 12.27 60.28 34.11 82.04 21.84 21.76 51.46 33.99 82.35 33.99 30.89 0 60.51-12.23 82.35-33.99 21.84-21.76 34.11-51.27 34.11-82.04z" />
          </clipPath>
        </defs>

        <style>{`
          .s0{opacity:.35;fill:#f7931a;stroke:#f7931a}
          .s1{fill:#1c252e}
          .s2{opacity:.35;fill:#bba036;stroke:#bba036}
          .s3{fill:#ffffff;stroke:#e5deff;stroke-width:2}
          .s4{opacity:.35;fill:#232930;stroke:#232930}
          .s5{opacity:.35;fill:#3468d1;stroke:#3468d1}
          .s6{opacity:.35;fill:#627eea;stroke:#627eea}
        `}</style>

        {coins.map(({ id, t0, down, side }) => {
          const { x, y, times } = buildKeyframes(t0, down, side);
          return (
            <m.g
              key={id}
              initial={{ translateX: 0, translateY: 0 }}
              animate={{ translateX: x, translateY: y }}
              transition={{
                duration: DURATION,
                ease: 'easeInOut',
                times,
                repeat: Infinity,
              }}
              style={{
                transformBox: 'fill-box',
                transformOrigin: '50% 50%',
                willChange: 'transform',
              }}
            >
              {id === 'BTC' && (
                <>
                  <path
                    className="s0"
                    d="m136 141.5c10.78 0 19.5 8.52 19.5 19 0 10.48-8.72 19-19.5 19-10.78 0-19.5-8.52-19.5-19 0-10.48 8.72-19 19.5-19z"
                  />
                  <path
                    className="s1"
                    d="m131.76 168v-14.54h5.09q1.52-0.01 2.5 0.52 0.99 0.52 1.47 1.4 0.49 0.87 0.49 1.94 0 0.94-0.34 1.55-0.32 0.61-0.86 0.96-0.54 0.36-1.16 0.53v0.14q0.67 0.04 1.34 0.47 0.68 0.42 1.13 1.22 0.45 0.8 0.46 1.95-0.01 1.09-0.5 1.96-0.5 0.88-1.57 1.39-1.07 0.51-2.79 0.51zm1.76-1.56h3.49q1.73 0 2.45-0.67 0.74-0.67 0.74-1.63-0.01-0.74-0.38-1.37-0.38-0.63-1.07-1.01-0.7-0.38-1.65-0.38h-3.58zm0-6.59h3.27q0.79 0 1.43-0.31 0.65-0.32 1.02-0.88 0.39-0.57 0.39-1.34 0-0.96-0.67-1.62-0.67-0.68-2.12-0.68h-3.32z"
                  />
                </>
              )}
              {id === 'DOGE' && (
                <>
                  <path
                    fillRule="evenodd"
                    className="s2"
                    d="m57 136.5c-10.78 0-19.5-8.72-19.5-19.5 0-10.78 8.72-19.5 19.5-19.5 10.78 0 19.5 8.72 19.5 19.5 0 10.78-8.72 19.5-19.5 19.5z"
                  />
                  <path
                    className="s1"
                    d="m57.25 124.2h-4.49v-14.54h4.69q2.12 0 3.62 0.87 1.51 0.87 2.31 2.5 0.8 1.62 0.8 3.87 0 2.28-0.81 3.92-0.81 1.63-2.36 2.51-1.54 0.88-3.76 0.87zm-2.73-1.56h2.62q1.8 0 2.99-0.69 1.18-0.7 1.76-1.99 0.59-1.28 0.59-3.06 0-1.76-0.58-3.03-0.57-1.28-1.72-1.96-1.14-0.69-2.84-0.69h-2.82z"
                  />
                </>
              )}
              {id === 'XRP' && (
                <>
                  <path
                    fillRule="evenodd"
                    className="s4"
                    d="m214.5 125.5c-10.51 0-19-8.49-19-19 0-10.51 8.49-19 19-19 10.51 0 19 8.49 19 19 0 10.51-8.49 19-19 19z"
                  />
                  <path
                    className="s1"
                    d="m211.26 99.45l3.75 6.06h0.12l3.75-6.06h2.07l-4.57 7.28 4.57 7.27h-2.07l-3.75-5.94h-0.12l-3.75 5.94h-2.07l4.69-7.27-4.69-7.28z"
                  />
                </>
              )}
              {id === 'ADA' && (
                <>
                  <path
                    className="s5"
                    d="m176 0.5c10.78 0 19.5 8.52 19.5 19 0 10.48-8.72 19-19.5 19-10.78 0-19.5-8.52-19.5-19 0-10.48 8.72-19 19.5-19z"
                  />
                  <path
                    className="s1"
                    d="m181.47 17h-1.76q-0.16-0.76-0.55-1.34-0.39-0.57-0.94-0.96-0.55-0.4-1.21-0.6-0.67-0.2-1.4-0.2-1.32 0-2.39 0.67-1.07 0.67-1.7 1.97-0.62 1.3-0.62 3.19 0 1.89 0.62 3.19 0.63 1.3 1.7 1.96 1.07 0.67 2.39 0.67 0.73 0 1.4-0.2 0.66-0.2 1.21-0.59 0.55-0.39 0.94-0.97 0.39-0.58 0.55-1.34h1.76q-0.2 1.12-0.73 2-0.52 0.88-1.3 1.5-0.79 0.61-1.76 0.93-0.97 0.32-2.07 0.32-1.86 0-3.31-0.91-1.44-0.91-2.28-2.59-0.83-1.67-0.83-3.97 0-2.3 0.83-3.98 0.84-1.68 2.28-2.59 1.45-0.9 3.31-0.9 1.1 0 2.07 0.32 0.97 0.31 1.76 0.93 0.78 0.61 1.3 1.49 0.53 0.88 0.73 2z"
                  />
                </>
              )}
              {id === 'ETH' && (
                <>
                  <path
                    fillRule="evenodd"
                    className="s6"
                    d="m92 59.5c-10.78 0-19.5-8.72-19.5-19.5 0-10.78 8.72-19.5 19.5-19.5 10.78 0 19.5 8.72 19.5 19.5 0 10.78-8.72 19.5-19.5 19.5z"
                  />
                  <path
                    className="s1"
                    d="m87.76 48v-14.55h8.78v1.57h-7.02v4.91h6.57v1.56h-6.57v4.95h7.13v1.56z"
                  />
                </>
              )}
            </m.g>
          );
        })}

        {/* Basket */}
        <g id="Clip-Path" clipPath="url(#cp1)">
          <path
            id="BASKET"
            className="s3"
            d="m271 168c0 35.8-14.28 70.14-39.69 95.46-25.41 25.32-59.87 39.54-95.81 39.54-35.94 0-70.4-14.22-95.81-39.54-25.41-25.32-39.69-59.66-39.69-95.46h19.04c0 30.77 12.27 60.28 34.11 82.04 21.84 21.76 51.46 33.99 82.35 33.99 30.89 0 60.51-12.23 82.35-33.99 21.84-21.76 34.11-51.27 34.11-82.04z"
          />
        </g>
      </m.svg>
    </LazyMotion>
  );
}
