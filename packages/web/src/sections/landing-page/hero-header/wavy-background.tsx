'use client';

import { createNoise3D } from 'simplex-noise';
import React, { useRef, useState, useEffect } from 'react';

import { cn } from './lib/utils';

/* ----------------------------------------------------------------------- */

type WavyBackgroundProps = {
  children?: React.ReactNode;
  className?: string; // styles for the *inner* children wrapper
  containerClassName?: string; // extra classes for the overlay itself
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: 'slow' | 'fast';
  waveOpacity?: number;
  fullScreen?: boolean; // <- NEW: true = fixed, false = absolute
} & React.HTMLAttributes<HTMLDivElement>;

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = 'fast',
  waveOpacity = 0.5,
  fullScreen = false,
  ...rest
}: WavyBackgroundProps) => {
  /* ---------------- animated canvas setup ---------------- */

  const noise = createNoise3D();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getSpeed = () => (speed === 'slow' ? 0.001 : 0.002);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const resize = () => {
      ctx.canvas.width = window.innerWidth;
      ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
    };
    resize();
    window.addEventListener('resize', resize);

    const waveColors = colors ?? ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee'];

    let nt = 0;
    const drawWave = (n: number) => {
      nt += getSpeed();
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth || 50;
        ctx.strokeStyle = waveColors[i % waveColors.length];
        for (let x = 0; x < ctx.canvas.width; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100;
          ctx.lineTo(x, y + ctx.canvas.height * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    };

    const render = () => {
      ctx.fillStyle = backgroundFill || 'black';
      ctx.globalAlpha = waveOpacity;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawWave(5);
      animationId = requestAnimationFrame(render);
    };

    let animationId = requestAnimationFrame(render);

    // eslint-disable-next-line consistent-return
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [blur, speed, colors, waveWidth, backgroundFill, waveOpacity]);

  /* ---------------- safari blur fallback ----------------- */

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(
      typeof navigator !== 'undefined' &&
        navigator.userAgent.includes('Safari') &&
        !navigator.userAgent.includes('Chrome')
    );
  }, []);

  /* --------------------------- JSX ----------------------- */

  return (
    <div
      className={cn(
        fullScreen
          ? 'fixed inset-0 -z-10 pointer-events-none'
          : 'absolute inset-0 -z-10 pointer-events-none',
        containerClassName
      )}
      {...rest}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={isSafari ? { filter: `blur(${blur}px)` } : undefined}
      />
      {children && <div className={cn('relative z-10', className)}>{children}</div>}
    </div>
  );
};
