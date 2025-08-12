'use client';

import React, { useRef, useEffect } from 'react';
import { createNoise3D } from 'simplex-noise';
import { cn } from './lib/utils';

type WavyBackgroundProps = {
  children?: React.ReactNode;
  className?: string; // inner content wrapper
  containerClassName?: string; // overlay container
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: 'slow' | 'fast';
  waveOpacity?: number;
  fullScreen?: boolean;

  /** NEW: how to size the canvas */
  sizing?: 'container' | 'viewport';
  /** NEW: vertical anchor for waves */
  baseline?: 'top' | 'center' | 'bottom' | number;
  /** NEW: additional Y offset in px (positive moves down) */
  yOffset?: number;
} & React.HTMLAttributes<HTMLDivElement>;

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth = 50,
  backgroundFill = 'white',
  blur = 10,
  speed = 'fast',
  waveOpacity = 0.5,
  fullScreen = false,
  sizing = 'container',
  baseline = 'center',
  yOffset = 0,
  ...rest
}: WavyBackgroundProps) => {
  const noise = useRef(createNoise3D()).current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // keep latest config without re-binding the RAF loop
  const cfgRef = useRef({
    speed: speed === 'slow' ? 0.001 : 0.002,
    colors: colors ?? ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee'],
    waveOpacity,
    waveWidth,
    backgroundFill,
    baseline,
    yOffset,
    sizing,
  });
  useEffect(() => {
    cfgRef.current = {
      speed: speed === 'slow' ? 0.001 : 0.002,
      colors: colors ?? ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee'],
      waveOpacity,
      waveWidth,
      backgroundFill,
      baseline,
      yOffset,
      sizing,
    };
  }, [speed, colors, waveOpacity, waveWidth, backgroundFill, baseline, yOffset, sizing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let needsResize = true;

    const measure = () => {
      const currentSizing = cfgRef.current.sizing;
      if (currentSizing === 'viewport') {
        width = Math.max(1, Math.floor(window.innerWidth));
        height = Math.max(1, Math.floor(window.innerHeight));
      } else {
        const rect = container.getBoundingClientRect();
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
      }
      // back buffer size
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      // CSS size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // scale to CSS pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsResize = false;
    };

    // Observe container or window (depending on sizing mode)
    const ro = new ResizeObserver(() => {
      if (cfgRef.current.sizing === 'container') needsResize = true;
    });
    if (cfgRef.current.sizing === 'container') ro.observe(container);

    const onWinResize = () => {
      if (cfgRef.current.sizing === 'viewport') needsResize = true;
    };
    if (cfgRef.current.sizing === 'viewport') window.addEventListener('resize', onWinResize);

    let nt = 0;
    let rafId = 0;

    const drawFrame = () => {
      if (needsResize || width === 0 || height === 0) measure();

      const {
        backgroundFill: bg,
        colors: waveColors,
        waveOpacity: wAlpha,
        waveWidth: wWidth,
        speed: spd,
        baseline: base,
        yOffset: yOff,
      } = cfgRef.current;

      // clear fully (prevents flashing)
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // compute base Y
      const baseY =
        typeof base === 'number'
          ? base
          : base === 'top'
            ? 0
            : base === 'bottom'
              ? height
              : height * 0.5;

      // draw waves
      nt += spd;
      const waveCount = 5;
      ctx.lineWidth = wWidth;

      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        ctx.globalAlpha = wAlpha;
        ctx.strokeStyle = waveColors[i % waveColors.length];

        for (let x = 0; x <= width; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100 + baseY + yOff;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.closePath();
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [noise]);

  return (
    <div
      ref={containerRef}
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
        // CSS filter is cheaper and avoids context reconfiguration
        style={{ filter: `blur(${blur}px)` }}
      />
      {children && <div className={cn('relative z-10', className)}>{children}</div>}
    </div>
  );
};
