'use client';

import * as React from 'react';
import { m } from 'framer-motion';
import { cdn } from '@normalfinance/utils';

type Segment = {
  id: 'INPUT1' | 'INPUT2' | 'OUTPUT2' | 'OUTPUT1' | 'INPUT4' | 'INPUT3' | 'OUTPUT3' | 'OUTPUT4';
  reverse?: boolean;
  /** duration (seconds) for this segment’s beam */
  dur?: number;
  /** gap (seconds) to wait after the previous segment ends before starting this one */
  gap?: number;
};

export default function AnimatedPoolsFeature(props: React.SVGProps<SVGSVGElement>) {
  // stroke draw-on animation for all wires
  const draw = {
    hidden: { pathLength: 0, opacity: 0.6 },
    show: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 2.2, ease: 'easeInOut' },
        opacity: { duration: 0.3 },
      },
    },
  };

  // soft pulsing glow
  const pulse = {
    initial: { scale: 1, opacity: 0.9 },
    animate: {
      scale: [1, 1.06, 1],
      opacity: [0.9, 1, 0.9],
      transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  // defaults used when a segment omits them
  const DEFAULT_DUR = 0.8;
  const DEFAULT_GAP = 0.15;

  // sequencing config for the beam (now with per-segment durations)
  const SEGMENTS: readonly Segment[] = [
    { id: 'INPUT1', reverse: false, dur: 0.7 },
    { id: 'INPUT2', reverse: true, dur: 0.8 },
    { id: 'OUTPUT2', reverse: true, dur: 0.4 },
    { id: 'OUTPUT1', reverse: true, dur: 0.9 },
    { id: 'INPUT4', reverse: false, dur: 0.9 },
    { id: 'INPUT3', reverse: true, dur: 0.7 },
    { id: 'OUTPUT3', reverse: false, dur: 1.1 },
    { id: 'OUTPUT4', reverse: true, dur: 0.8 },
  ] as const;

  return (
    <svg
      viewBox="0 0 568 886"
      width="100%"
      height="auto"
      role="img"
      aria-label="Provide liquidity to pools on Normal and create indexes to earn yield."
      {...props}
    >
      {/* Base art */}
      <image
        href={cdn('homepage/pools-feature.svg')}
        x="0"
        y="0"
        width="568"
        height="886"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* === Overlay wires (exact paths) === */}
      {/* INPUT1 / OUTPUT1 */}
      <m.path
        id="INPUT1"
        d="M68 99v101c0 8.84 7.16 16 16 16h14"
        fill="none"
        stroke="#E9E4FF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />
      <m.path
        id="OUTPUT1"
        d="M46 99v144c0 8.84 7.16 16 16 16h36"
        fill="none"
        stroke="#E6EFFF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />

      {/* INPUT2 */}
      <m.path
        id="INPUT2"
        d="M372 352v-120c0-8.84-7.16-16-16-16h-14"
        fill="none"
        stroke="#E9E4FF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />

      {/* Additional wires */}
      <m.path
        id="OUTPUT2"
        d="m198.5 294v58.21"
        fill="none"
        stroke="#E6EFFF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />
      <m.path
        id="INPUT3"
        d="m371 540v120.5c0 8.84-7.16 16-16 16h-14"
        fill="none"
        stroke="#E9E4FF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />
      <m.path
        id="OUTPUT3"
        d="m87 493.43h-2.9c-8.83 0.01-15.99 7.16-16 16l-0.09 197.85c-0.01 8.84 7.15 16 15.98 16.01l14.01 0.01"
        fill="none"
        stroke="#E6EFFF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />
      <m.path
        id="INPUT4"
        d="m128 831.3h149c8.84 0 16-7.16 16-16v-67.3"
        fill="none"
        stroke="#E9E4FF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />
      <m.path
        id="OUTPUT4"
        d="m128 812.24h63c8.84 0 16-7.17 16-16v-48.24"
        fill="none"
        stroke="#E6EFFF"
        strokeWidth="2"
        strokeLinecap="round"
        variants={draw}
        initial="hidden"
        animate="show"
      />

      {/* === Beam that auto-chains across all wires === */}
      {SEGMENTS.map((seg, i, arr) => {
        const id = `beam${i + 1}`;
        const prev = `beam${i === 0 ? arr.length : i}`;
        const dur = (seg.dur ?? DEFAULT_DUR).toString();
        const gap = seg.gap ?? DEFAULT_GAP;

        // First run starts immediately; subsequent runs wait for previous to end.
        // Also let the first run re-begin after the last ends (for infinite loop).
        const begin = `${i === 0 ? '0s;' : ''}${prev}.end+${gap}s`;

        return (
          <g key={id}>
            <circle r="3" fill="#6E4BFF" opacity="0">
              <animateMotion
                id={id}
                dur={`${dur}s`}
                begin={begin}
                fill="remove"
                {...(seg.reverse ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {})}
              >
                <mpath href={`#${seg.id}`} />
              </animateMotion>

              {/* fade in at start → fade out by end (synced to animateMotion) */}
              <animate
                attributeName="opacity"
                values="0;1;0"
                keyTimes="0;0.2;1"
                dur={`${dur}s`}
                begin={`${id}.begin`}
                fill="remove"
              />
            </circle>
          </g>
        );
      })}

      {/* Pulses on chips/badges */}
      <m.circle cx="157" cy="175" r="18" fill="rgba(110,75,255,0.12)" {...pulse} />
      <m.circle cx="140" cy="629" r="18" fill="rgba(110,75,255,0.12)" {...pulse} />
    </svg>
  );
}
