import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';
import type { MotionProps, MotionValue, SpringOptions } from 'framer-motion';

import { useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import SwapCard from '@/components/_common/swap-card';
import { SignInButton } from '@/layouts/components/sign-in-button';
import { m, useScroll, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { CONFIG } from 'src/global-config';

import { varFade, MotionContainer } from 'src/components/animate';

import { HeroBackground } from './components/hero-background';

// ----------------------------------------------------------------------

const smKey: Breakpoint = 'sm';
const mdKey: Breakpoint = 'md';
const lgKey: Breakpoint = 'lg';

const motionProps: MotionProps = {
  variants: varFade('inUp', { distance: 24 }),
};

export function HomeHero({ sx, ...other }: BoxProps) {
  const scrollProgress = useScrollPercent();
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up(mdKey));

  // Get hero height (note: on first render this may be 0)
  const heroHeight = scrollProgress.elementRef.current?.offsetHeight || 0;
  const halfScroll = heroHeight / 2;

  // Create a delayed progress MotionValue that goes from 0 to 1 between these scroll values
  const slowProgress = useTransform(
    scrollProgress.scrollY,
    [halfScroll, heroHeight + 1600],
    [0, 1]
  ); // Use the delayedProgress for your translations instead of the raw scroll progress
  const y1 = useTransformY(slowProgress, -600);
  const y2 = useTransformY(slowProgress, -600);
  const y3 = useTransformY(slowProgress, -600);
  const y5 = useTransformY(slowProgress, -600);

  // Use delayedProgress for opacity as well.
  // For example, fully opaque until animation starts, then fades out.
  const opacity: MotionValue<number> = useTransform(slowProgress, [0, 1], [1, mdUp ? 0 : 1]);

  const { authenticated } = usePrivy();

  const renderHeading = () => (
    <m.div {...motionProps}>
      <Box
        component="h1"
        sx={[
          {
            my: 0,
            mx: 'auto',
            maxWidth: 680,
            display: 'flex',
            flexWrap: 'wrap',
            typography: 'h2',
            justifyContent: 'center',
            fontFamily: theme.typography.fontSecondaryFamily,
            [theme.breakpoints.up(lgKey)]: {
              fontSize: theme.typography.pxToRem(64),
              lineHeight: '72px',
            },
          },
        ]}
      >
        <Box component="span" sx={{ width: 1, opacity: 0.24 }}>
          Swap any crypto,
        </Box>
        <Box
          component={m.span}
          animate={{ backgroundPosition: '200% center' }}
          transition={{
            duration: 20,
            ease: 'linear',
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          sx={{
            ...theme.mixins.textGradient(
              `300deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.secondary.main} 25%, ${theme.vars.palette.error.main} 50%, ${theme.vars.palette.warning.main} 75%, ${theme.vars.palette.primary.main} 100%`
            ),
            backgroundSize: '400%',
            ml: { xs: 0.75, md: 1, xl: 1.5 },
            marginBottom: 1,
          }}
        >
          on-chain.
        </Box>
      </Box>
    </m.div>
  );

  const renderText = () => (
    <m.div {...motionProps}>
      <Typography
        variant="body2"
        sx={{
          mx: 'auto',
          [theme.breakpoints.up(smKey)]: { whiteSpace: 'pre' },
          [theme.breakpoints.up(lgKey)]: { fontSize: 14, lineHeight: '20px' },
          marginBottom: 3,
        }}
      >
        {`Invest in any crypto directly on Solana without bridges or CEXes -\ncreate & use crypto index funds to diversify & automate your investing.`}
      </Typography>
    </m.div>
  );

  const renderIcons = () => (
    <Stack spacing={2} sx={{ textAlign: 'center' }}>
      <m.div {...motionProps}>
        {!authenticated ? (
          <SignInButton title="Get your whitelist spot" size="large" sx={{ my: 2 }} />
        ) : (
          <Typography
            variant="body2"
            sx={{
              mx: 'auto',
              [theme.breakpoints.up(smKey)]: { whiteSpace: 'pre' },
              [theme.breakpoints.up(lgKey)]: { fontSize: 20, lineHeight: '36px' },
            }}
          >
            Connected, now go complete some quests!
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography variant="overline" sx={{ opacity: 0.4 }}>
            Launching Soon On
          </Typography>
        </Box>
      </m.div>

      <Box sx={{ gap: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {['solana', 'stellar'].map((platform) => (
          <m.div {...motionProps} key={platform}>
            <Box
              component="img"
              alt={platform}
              src={`${CONFIG.assetsDir}/assets/icons/platforms/${platform}.svg`}
              sx={[
                {
                  width: 80,
                  ...theme.applyStyles('dark', {
                    ...(platform === 'nextjs' && { filter: 'invert(1)' }),
                  }),
                },
              ]}
            />
          </m.div>
        ))}
      </Box>
    </Stack>
  );

  return (
    <Box
      ref={scrollProgress.elementRef}
      component="section"
      sx={[
        {
          overflow: 'hidden',
          position: 'relative',
          [theme.breakpoints.up(mdKey)]: {
            minHeight: 760,
            display: 'block',
            willChange: 'opacity',
            mt: 'calc(var(--layout-header-desktop-height) * -1)',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        component={m.div}
        style={{ opacity }}
        sx={{
          width: 1,
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          transition: theme.transitions.create(['opacity']),
        }}
      >
        <Container
          component={MotionContainer}
          sx={{
            py: 3,
            gap: 2,
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            [theme.breakpoints.up(mdKey)]: {
              flex: '1 1 auto',
              justifyContent: 'flex-start',
              py: 'var(--layout-header-desktop-height)',
            },
          }}
        >
          <Stack spacing={0} sx={{ textAlign: 'center', alignItems: 'center' }}>
            <m.div style={{ y: y1 }}>{renderHeading()}</m.div>
            <m.div style={{ y: y2 }}>{renderText()}</m.div>
            <m.div {...motionProps} style={{ y: y3, maxWidth: '480px' }}>
              <SwapCard tokensList={CONFIG.tokenList} swapFeeInfo={CONFIG.swapFeeInfo} />
            </m.div>
          </Stack>
          <m.div style={{ y: y5 }}>{renderIcons()}</m.div>
        </Container>

        <HeroBackground />
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

function useTransformY(value: MotionValue<number>, distance: number) {
  const physics: SpringOptions = {
    mass: 0.1,
    damping: 20,
    stiffness: 300,
    restDelta: 0.001,
  };

  return useSpring(useTransform(value, [0, 1], [0, distance]), physics);
}

function useScrollPercent() {
  const elementRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();

  const [percent, setPercent] = useState(0);

  useMotionValueEvent(scrollY, 'change', (scrollHeight) => {
    let heroHeight = 0;

    if (elementRef.current) {
      heroHeight = elementRef.current.offsetHeight;
    }

    const scrollPercent = Math.floor((scrollHeight / heroHeight) * 100);

    if (scrollPercent >= 100) {
      setPercent(100);
    } else {
      setPercent(Math.floor(scrollPercent));
    }
  });

  return { elementRef, percent, scrollY };
}
