'use client';

import React from 'react';
import { m } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

type Pt = { lat: number; lng: number; label?: string };

interface MapProps {
  backgroundSrc: string;
  dots?: Array<{ start: Pt; end: Pt }>;
  lineColor?: string;
  duration?: number;
  stagger?: number;
  baseDelay?: number;
  viewportAmount?: number;
  viewportMargin?: string;
}

const projectPoint = (lat: number, lng: number) => {
  const x = (lng + 180) * (800 / 360);
  const y = (90 - lat) * (400 / 180);
  return { x, y };
};

const createCurvedPath = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const midX = (start.x + end.x) / 2;
  const midY = Math.min(start.y, end.y) - 50;
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
};

const WorldMap: React.FC<MapProps> = ({
  backgroundSrc,
  dots = [],
  lineColor = '#C684FF',
  duration = 1.1,
  stagger = 0.4,
  baseDelay = 0.1,
  viewportAmount = 0.2,
  viewportMargin = '0px 0px -10% 0px',
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 1',
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        component="img"
        src={backgroundSrc}
        alt="world map"
        draggable={false}
        loading="eager"
        decoding="async"
        width={1056}
        height={528}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      <Box
        component="svg"
        viewBox="0 0 800 400"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {dots.map((dot, i) => {
          const s = projectPoint(dot.start.lat, dot.start.lng);
          const e = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`path-${i}`}>
              <m.path
                d={createCurvedPath(s, e)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ amount: viewportAmount, margin: viewportMargin, once: false }}
                transition={{
                  duration,
                  delay: baseDelay + stagger * i,
                  ease: 'easeOut',
                }}
              />
            </g>
          );
        })}

        {dots.map((dot, i) => {
          const s = projectPoint(dot.start.lat, dot.start.lng);
          const e = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`pts-${i}`}>
              {[s, e].map((p, j) => (
                <g key={`pt-${i}-${j}`}>
                  <circle cx={p.x} cy={p.y} r="2" fill={lineColor} />
                  <circle cx={p.x} cy={p.y} r="2" fill={lineColor} opacity="0.5">
                    <animate
                      attributeName="r"
                      from="2"
                      to="8"
                      dur="1.5s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}
            </g>
          );
        })}
      </Box>
    </Box>
  );
};

export default WorldMap;
