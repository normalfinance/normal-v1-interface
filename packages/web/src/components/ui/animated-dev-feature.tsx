'use client';

import * as React from 'react';
import { m, domMax, useInView, LazyMotion, useAnimation, useReducedMotion } from 'framer-motion';

type Props = {
  className?: string;
  style?: React.CSSProperties;
  moveOffset?: { x: number; y: number };
  base?: number;
  pauseWhenOffscreen?: boolean;
  ariaLabel?: string;
  imageSrc?: string;
  loaderOffsetY?: number;
  loaderSize?: number;
  loaderBorder?: number;
  loaderColor?: string;
};

const VB_W = 1216;
const VB_H = 579;

const PANEL_X = 270;
const PANEL_Y = 160;
const PANEL_W = 676;
const PANEL_H = 436.71;

export default function AnimatedDevFeature2({
  className,
  style,
  moveOffset = { x: -27, y: 28 },
  base = 900, // slower than before
  pauseWhenOffscreen = true,
  ariaLabel = 'Developer feature animation',
  imageSrc = '/images/dev-feature.png',
  loaderOffsetY = 64,
  loaderSize = 96,
  loaderBorder = 4,
  loaderColor = '#6E4BFF',
}: Props) {
  const rid = React.useId();
  const scope = React.useMemo(() => `nf${rid.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rid]);

  const ids = React.useMemo(
    () => ({
      cp1: `${scope}-cp1`,
      cp2: `${scope}-cp2`,
      cp3: `${scope}-cp3`,
      img1: `${scope}-img1`,
    }),
    [scope]
  );

  const cls = React.useMemo(
    () => ({
      s0: `${scope}-s0`,
      s1: `${scope}-s1`,
      s2: `${scope}-s2`,
      s3: `${scope}-s3`,
      s4: `${scope}-s4`,
      s5: `${scope}-s5`,
      s6: `${scope}-s6`,
      s7: `${scope}-s7`,
      s8: `${scope}-s8`,
      s9: `${scope}-s9`,
      s10: `${scope}-s10`,
    }),
    [scope]
  );

  const LOADER_CX = PANEL_X + PANEL_W / 2;
  const LOADER_CY = PANEL_Y + PANEL_H / 2 + loaderOffsetY;

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const prefersReduced = useReducedMotion();
  const inView = useInView(svgRef, { amount: 0.2, margin: '0px 0px -10% 0px' });

  const ctrImage = useAnimation();
  const ctrMoving = useAnimation();
  const ctrNodes = useAnimation();
  const ctrLoader = useAnimation(); // opacity only

  // play/pause the CSS animation
  const [loaderRunning, setLoaderRunning] = React.useState(false);

  React.useEffect(() => {
    ctrImage.set({ opacity: 0 });
    ctrNodes.set({ opacity: 1 });
    ctrMoving.set({ x: 0, y: 0, opacity: 1 });
    ctrLoader.set({ opacity: 0 });
    setLoaderRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // initial state
    ctrImage.set({ opacity: 0 });
    ctrNodes.set({ opacity: 1 });
    ctrMoving.set({ x: 0, y: 0, opacity: 1 });
    ctrLoader.set({ opacity: 0 }); // 👈 keep loader hidden by default
    setLoaderRunning(false);

    if (prefersReduced) {
      // Respect reduced motion: keep everything static & hidden loader
      ctrLoader.set({ opacity: 0 });
      setLoaderRunning(false);
      return () => {}; // ✅ consistent-return
    }

    let mounted = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      while (mounted) {
        if (pauseWhenOffscreen && !inView) {
          await sleep(150);
          continue;
        }

        // 1) Move (loader hidden)
        setLoaderRunning(false);
        await ctrLoader.set({ opacity: 0 }); // 👈 hidden during move
        await ctrMoving.start({
          x: moveOffset.x,
          y: moveOffset.y,
          transition: { duration: base / 1000, ease: 'easeInOut' },
        });

        // 2) Show loader and spin
        await ctrLoader.start({ opacity: 1, transition: { duration: 0.2 } });
        setLoaderRunning(true);
        await sleep(base * 1.25 + 500);

        // 3) Fade out all
        await Promise.all([
          ctrLoader.start({ opacity: 0, transition: { duration: 0.3 } }),
          ctrMoving.start({ opacity: 0, transition: { duration: 0.3 } }),
          ctrNodes.start({ opacity: 0, transition: { duration: 0.3 } }),
        ]);

        // 3.5) Reset MOVING position while hidden
        await ctrMoving.set({ x: 0, y: 0 });

        // 4) Show image briefly
        await ctrImage.start({ opacity: 1, transition: { duration: 0.4 } });
        await sleep(2000);
        await ctrImage.start({ opacity: 0, transition: { duration: 0.4 } });

        // 5) Bring nodes + moving back; keep loader hidden for next cycle
        setLoaderRunning(false);
        await Promise.all([
          ctrNodes.start({ opacity: 1, transition: { duration: 0.3 } }),
          ctrMoving.start({ opacity: 1, transition: { duration: 0.3 } }),
          ctrLoader.set({ opacity: 0 }),
        ]);

        await sleep(120);
      }
    })();

    return () => {
      mounted = false;
      ctrImage.stop();
      ctrNodes.stop();
      ctrMoving.stop();
      ctrLoader.stop();
    };
  }, [
    prefersReduced,
    inView,
    pauseWhenOffscreen,
    base,
    moveOffset.x,
    moveOffset.y,
    ctrImage,
    ctrNodes,
    ctrMoving,
    ctrLoader,
  ]);

  return (
    <LazyMotion features={domMax}>
      <m.svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
        className={className}
        style={{ pointerEvents: 'none', ...style }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0.2, once: false }}
      >
        <defs>
          <clipPath clipPathUnits="userSpaceOnUse" id={ids.cp1}>
            <path d="m16 0h1184c8.84 0 16 7.16 16 16v547c0 8.84-7.16 16-16 16h-1184c-8.84 0-16-7.16-16-16v-547c0-8.84 7.16-16 16-16z" />
          </clipPath>
          <clipPath clipPathUnits="userSpaceOnUse" id={ids.cp2}>
            <path d="m218 159h780v541h-780z" />
          </clipPath>
          <clipPath clipPathUnits="userSpaceOnUse" id={ids.cp3}>
            <path d="m218 172.04h780v71.7h-780z" />
          </clipPath>

          <image id={ids.img1} width="732" height="298" href={imageSrc} />
        </defs>

        <style>{`
          .${cls.s0}{fill:#efebfe}
          .${cls.s1}{opacity:.12;fill:none;stroke:#919eab}
          .${cls.s2}{fill:#fff;stroke:#6e4bff;stroke-width:2}
          .${cls.s3}{fill:none;stroke:#fff;stroke-width:2}
          .${cls.s4}{opacity:.15;fill:#6e4bff}
          .${cls.s5}{fill:#6e4bff}
          .${cls.s6}{fill:none;stroke:#a098f6;stroke-linecap:round;stroke-linejoin:round;stroke-width:2}
          .${cls.s7}{fill:#ffc0ec;stroke:#ff4bc9}
          .${cls.s8}{fill:#1c252e}
          .${cls.s9}{fill:none;stroke:#6e4bff}
          .${cls.s10}{fill:#ccc0ff;stroke:#6e4bff}
        `}</style>

        {/* background */}
        <path
          className={cls.s0}
          d="m0 24c0-13.25 10.75-24 24-24h1168c13.25 0 24 10.75 24 24v555h-1216z"
        />
        <path
          className={cls.s1}
          d="m24 .5h1168c12.98 0 23.5 10.52 23.5 23.5v554.5h-1215v-554.5c0-12.98 10.52-23.5 23.5-23.5z"
        />

        <g clipPath={`url(#${ids.cp1})`}>
          <g clipPath={`url(#${ids.cp2})`}>
            {/* inner panel */}
            <path
              className={cls.s2}
              d={`m${PANEL_X} ${PANEL_Y}h${PANEL_W}c28.16 0 51 22.9 51 51.15v436.71c0 28.24-22.84 51.14-51 51.14h-${PANEL_W}c-28.16 0-51-22.9-51-51.14v-436.71c0-28.25 22.84-51.15 51-51.15z`}
            />
            <path
              className={cls.s3}
              d="m946 165.52h-676c-25.13 0-45.5 20.43-45.5 45.63v436.71c0 25.19 20.37 45.62 45.5 45.62h676c25.13 0 45.5-20.43 45.5-45.62v-436.71c0-25.2-20.37-45.63-45.5-45.63z"
            />
            <g clipPath={`url(#${ids.cp3})`}>
              <path className={cls.s4} d="m998 243.74v-13.04h-780v13.04 13.03h780z" />
            </g>

            {/* window dots */}
            <circle className={cls.s5} cx="273.25" cy="201.37" r="16.25" />
            <circle className={cls.s5} cx="331.75" cy="201.37" r="16.25" />
            <circle className={cls.s5} cx="390.25" cy="201.37" r="16.25" />

            {/* IMAGE */}
            <m.use
              href={`#${ids.img1}`}
              x="242"
              y="265"
              width="732"
              height="298"
              animate={ctrImage}
            />

            {/* NODES */}
            <m.g animate={ctrNodes} style={{ willChange: 'opacity' }}>
              <g id={`${scope}-N1`}>
                <path
                  className={cls.s7}
                  d="m307 322.5c10.78 0 19.5 8.52 19.5 19 0 10.48-8.72 19-19.5 19-10.78 0-19.5-8.52-19.5-19 0-10.48 8.72-19 19.5-19z"
                />
                <path
                  className={cls.s8}
                  d="m301.86 349v-14h1.72l8.34 11.24v-11.24h1.7v14h-1.7l-8.36-11.3v11.3z"
                />
                <path className={cls.s9} fillRule="evenodd" d="m281.5 315.5h53v51h-53z" />
              </g>
              <g id={`${scope}-N2`}>
                <path className={cls.s9} fillRule="evenodd" d="m334.5 366.5h53v51h-53z" />
                <path
                  className={cls.s7}
                  d="m361 373.5c10.78 0 19.5 8.52 19.5 19 0 10.48-8.72 19-19.5 19-10.78 0-19.5-8.52-19.5-19 0-10.48 8.72-19 19.5-19z"
                />
                <path
                  className={cls.s8}
                  d="m355.86 400v-14h1.72l8.34 11.24v-11.24h1.7v14h-1.7l-8.36-11.3v11.3z"
                />
              </g>
              <g id={`${scope}-N3`}>
                <path className={cls.s9} fillRule="evenodd" d="m281.5 366.5h53v51h-53z" />
                <path
                  className={cls.s10}
                  d="m308 373.5c10.78 0 19.5 8.52 19.5 19 0 10.48-8.72 19-19.5 19-10.78 0-19.5-8.52-19.5-19 0-10.48 8.72-19 19.5-19z"
                />
                <path
                  className={cls.s8}
                  d="m302.86 400v-14h1.72l8.34 11.24v-11.24h1.7v14h-1.7l-8.36-11.3v11.3z"
                />
              </g>
            </m.g>

            {/* CSS LOADER */}
            <m.foreignObject
              x={LOADER_CX - loaderSize / 2}
              y={LOADER_CY - loaderSize / 2}
              width={loaderSize}
              height={loaderSize}
              animate={ctrLoader}
              initial={{ opacity: 1 }}
              style={{ willChange: 'opacity' }}
            >
              <div>
                <style>{`
                  .${scope}-loader {
                    width: ${loaderSize}px;
                    aspect-ratio: 1;
                    border-radius: 50%;
                    border: ${loaderBorder}px solid ${loaderColor};
                    animation:
                      ${scope}-l20-1 0.8s infinite linear alternate,
                      ${scope}-l20-2 1.6s infinite linear;
                    box-sizing: border-box;
                  }
                  @keyframes ${scope}-l20-1{
                    0%    {clip-path: polygon(50% 50%,0       0,  50%   0%,  50%    0%, 50%    0%, 50%    0%, 50%    0% )}
                    12.5% {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100%   0%, 100%   0%, 100%   0% )}
                    25%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 100% 100%, 100% 100% )}
                    50%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                    62.5% {clip-path: polygon(50% 50%,100%    0, 100%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                    75%   {clip-path: polygon(50% 50%,100% 100%, 100% 100%,  100% 100%, 100% 100%, 50%  100%, 0%   100% )}
                    100%  {clip-path: polygon(50% 50%,50%  100%,  50% 100%,   50% 100%,  50% 100%, 50%  100%, 0%   100% )}
                  }
                  @keyframes ${scope}-l20-2{ 
                    0%    {transform:scaleY(1)  rotate(0deg)}
                    49.99%{transform:scaleY(1)  rotate(135deg)}
                    50%   {transform:scaleY(-1) rotate(0deg)}
                    100%  {transform:scaleY(-1) rotate(-135deg)}
                  }
                `}</style>

                {/* play-state toggled here */}
                <div
                  className={`${scope}-loader`}
                  style={{ animationPlayState: loaderRunning ? 'running' : 'paused' }}
                />
              </div>
            </m.foreignObject>
          </g>

          {/* MOVING tile */}
          <m.g
            animate={ctrMoving}
            initial={{ x: 0, y: 0, opacity: 1 }}
            style={{
              transformBox: 'fill-box',
              transformOrigin: '50% 50%',
              willChange: 'transform,opacity',
            }}
          >
            <path className={cls.s9} fillRule="evenodd" d="m361.5 287.5h53v51h-53z" />
            <path
              className={cls.s10}
              d="m388 293.5c10.78 0 19.5 8.52 19.5 19 0 10.48-8.72 19-19.5 19-10.78 0-19.5-8.52-19.5-19 0-10.48 8.72-19 19.5-19z"
            />
            <path
              className={cls.s8}
              d="m382.86 320v-14h1.72l8.34 11.24v-11.24h1.7v14h-1.7l-8.36-11.3v11.3z"
            />
          </m.g>
        </g>
      </m.svg>
    </LazyMotion>
  );
}
