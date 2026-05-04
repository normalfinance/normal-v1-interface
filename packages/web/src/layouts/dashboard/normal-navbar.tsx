'use client';

import type { ButtonProps as MUIButtonProps } from '@mui/material';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { usePathname } from '@/routes/hooks';
import { m, AnimatePresence } from 'framer-motion';
import React, { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';


import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { Box, Button, IconButton, Typography, useMediaQuery } from '@mui/material';

import { Logo } from '@/components/template/logo';



const NAV_ITEMS: { url: string; label: string }[] = [
  { url: paths.help.feedbackForm, label: 'Feedback' },
];

const linkAttrs = (url: string, target?: React.HTMLAttributeAnchorTarget, rel?: string) => {
  const isExternal = /^https?:\/\//i.test(url);
  const t = target ?? (isExternal ? '_blank' : undefined);
  const r = rel ?? (t === '_blank' ? 'noopener noreferrer' : undefined);
  return { target: t, rel: r };
};

export type NavButton = Omit<MUIButtonProps, 'children'> & {
  title: string;
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
  component?: React.ElementType;
};
type ImageProps = { url?: string; src: string; alt?: string };

type MegaMenuLink = {
  url: string;
  image: ImageProps;
  title: string;
  description: string;
  button?: NavButton;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
};

type CategoryLink = { title: string; links: MegaMenuLink[] };

type MegaMenuProps = {
  categoryLinks: CategoryLink[];
  featuredSections?: { title: string; links: MegaMenuLink[] };
  button?: NavButton;
};

type LinkProps = {
  title: string;
  url: string;
  megaMenu?: MegaMenuProps;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
};

export interface Props {
  logo: ImageProps;
  links: LinkProps[];
  buttons: NavButton[];
  language?: React.ReactNode;
  account?: React.ReactNode;
  networkToggle?: React.ReactNode;
}

export type NormalNavbarProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const NormalNavbar: React.FC<NormalNavbarProps> = (props) => {
  const { t } = useTranslate();
  const { links = [], language, account, networkToggle } = props;
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const pathname = usePathname();

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);


  const clearTimer = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };
  const scheduleClose = useCallback((delay = 120) => {
    clearTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      setDockOpen(false);
      setActiveIdx(null);
    }, delay);
  }, []);
  const openDock = useCallback((idx: number) => {
    clearTimer();
    setActiveIdx(idx);
    setDockOpen(true);
  }, []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = () => setMobileOpen((p) => !p);
  // const closeMobile = () => setMobileOpen(false);

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = useState(64);

  const mobilePanelVariants = {
    open: (h: number) => ({ height: `calc(100dvh - ${h}px)`, opacity: 1 }),
    close: () => ({ height: 0, opacity: 0.98 }),
  } as const;

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderH(el.getBoundingClientRect().height || 64);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // eslint-disable-next-line consistent-return
    return () => ro.disconnect();
  }, []);

  const lineStyle: React.CSSProperties = {
    display: 'block',
    width: '1.0rem',
    height: 2,
    margin: '2px 0',
    backgroundColor: 'currentColor',
    borderRadius: 9999,
  };

  return (
    <Box
      component="section"
      id="normal-navbar"
      ref={headerRef}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (_theme) => _theme.zIndex.appBar,
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
        background: 'linear-gradient(180deg, rgba(234, 250, 254, 0.85) 0%, rgba(245, 240, 255, 0.78) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        minHeight: { xs: 64, lg: 72 },
        px: { xs: 2, lg: 4 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr auto', lg: 'auto auto 1fr' },
          alignItems: 'center',
          columnGap: 2,
        }}
      >
        {/* Column 1: Logo + mobile hamburger */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Logo isSingle={false} sx={{ display: { xs: 'none', lg: 'inline-flex' }, height: 28 }} />
          <IconButton
            onClick={toggleMobile}
            aria-label={mobileOpen ? t('Close menu') : t('Open menu')}
            sx={{
              display: { xs: 'inline-flex', lg: 'none' },
              width: 32,
              height: 32,
              p: 0,
              color: 'text.primary',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <m.span
                style={lineStyle}
                animate={mobileOpen ? ['open', 'rotatePhase'] : 'closed'}
                variants={topLineVariants}
              />
              <m.span
                style={lineStyle}
                animate={mobileOpen ? 'open' : 'closed'}
                variants={middleLineVariants}
              />
              <m.span
                style={lineStyle}
                animate={mobileOpen ? ['open', 'rotatePhase'] : 'closed'}
                variants={bottomLineVariants}
              />
            </Box>
          </IconButton>
        </Box>

        {/* Column 2: All nav links — desktop only, left-aligned */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {NAV_ITEMS.filter((item) => item.label !== 'Feedback').map((item) => (
            <div key={item.url}>
              <Button
                component="a"
                href={item.url}
                sx={{
                  textTransform: 'none',
                  py: 0.5,
                  px: 1.5,
                  color: 'text.primary',
                  fontWeight: pathname.startsWith(item.url) ? 700 : 600,
                }}
              >
                {t(item.label)}
              </Button>
            </div>
          ))}
          {links.map((link, i) => {
            const hasMega = !!link.megaMenu;
            const { target, rel } = linkAttrs(link.url, link.target, link.rel);
            const chevronVariants = { open: { rotate: 180 }, closed: { rotate: 0 } } as const;
            if (hasMega) {
              return (
                <Box
                  key={i}
                  sx={{ position: 'relative' }}
                  onMouseEnter={() => openDock(i)}
                  onMouseLeave={() => scheduleClose()}
                >
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      openDock(i);
                    }}
                    aria-expanded={dockOpen && activeIdx === i ? true : undefined}
                    endIcon={
                      <m.span
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                        animate={dockOpen && activeIdx === i ? 'open' : 'closed'}
                        variants={chevronVariants}
                        transition={{ duration: 0.2 }}
                      >
                        <ExpandMoreIcon />
                      </m.span>
                    }
                    sx={{
                      textTransform: 'none',
                      py: 1,
                      px: 1.5,
                      color: 'text.primary',
                      fontWeight: 600,
                    }}
                  >
                    {t(link.title)}
                  </Button>
                  {isDesktop && (
                    <DesktopDock
                      open={dockOpen && activeIdx === i}
                      onMouseEnter={() => clearTimer()}
                      onMouseLeave={() => scheduleClose()}
                    >
                      <DockContent mega={link.megaMenu!} />
                    </DesktopDock>
                  )}
                </Box>
              );
            }
            return (
              <Box key={i}>
                <Button
                  component="a"
                  href={link.url}
                  target={target}
                  rel={rel}
                  sx={{
                    textTransform: 'none',
                    py: 1,
                    px: 1.5,
                    color: 'text.primary',
                    fontWeight: 600,
                  }}
                >
                  {t(link.title)}
                </Button>
              </Box>
            );
          })}
          {NAV_ITEMS.filter((item) => item.label === 'Feedback').map((item) => (
            <Button
              key={item.url}
              className="rainbow-button"
              component="a"
              variant="soft"
              onClick={() => window.open(item.url, '_blank', 'noopener')}
              sx={{
                textTransform: 'none',
                py: 0.5,
                px: 1.5,
                color: '#fff',
                fontSize: '12px',
              }}
            >
              {t(item.label)}
            </Button>
          ))}
        </Box>

        {/* Column 3: Account controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
          {networkToggle}
          {language}
          {account}
        </Box>
      </Box>


      <AnimatePresence initial={false}>
        {mobileOpen && (
          <m.div
            key="mobile-under-header"
            initial="close"
            animate="open"
            exit="close"
            custom={headerH}
            variants={mobilePanelVariants}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              top: headerH,
              zIndex: theme.zIndex.modal,
              background: 'linear-gradient(180deg, rgb(234, 250, 254) 0%, rgb(245, 240, 255) 100%)',
              overflow: 'hidden',
            }}
            aria-modal="true"
            role="dialog"
          >
            <Box sx={{ height: '100%', overflow: 'auto', px: '5%', py: 2 }}>
              {links
                .filter((l) => !!l.megaMenu)
                .map((link, i) => (
                  <MobileMega key={i} megaMenu={link.megaMenu!} />
                ))}
              <Box sx={{ mt: 2 }}>
                <Button
                  className="rainbow-button"
                  component="a"
                  variant="soft"
                  fullWidth
                  href={paths.help.feedbackForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    textTransform: 'none',
                    py: 1.5,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {t('Feedback')}
                </Button>
              </Box>
            </Box>
          </m.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

function DesktopDock({
  open,
  children,
  onMouseEnter,
  onMouseLeave,
}: React.PropsWithChildren<{
  open: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}>) {
  const theme = useTheme();
  return (
    <m.div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={false}
      animate={open ? 'open' : 'closed'}
      variants={{
        open: { opacity: 1, y: 0, pointerEvents: 'auto' as const },
        closed: { opacity: 0, y: -6, pointerEvents: 'none' as const },
      }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: theme.zIndex.appBar + 1,
        marginTop: 4,
      }}
    >
      <Box
        sx={{
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          background: 'linear-gradient(180deg, rgb(234, 250, 254) 0%, rgb(245, 240, 255) 100%)',
          boxShadow: `0 16px 40px ${alpha('#000', 0.14)}`,
          overflow: 'hidden',
          px: 1,
        }}
      >
        {children}
      </Box>
    </m.div>
  );
}

function DockContent({ mega }: { mega: MegaMenuProps }) {
  const { t: tDock } = useTranslate();
  const allLinks = mega.categoryLinks.flatMap((group) => group.links);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* Left: flat link list — 2 columns */}
      <Box
        sx={{
          width: 480,
          py: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          alignContent: 'start',
          gap: 0.5,
        }}
      >
        {allLinks.map((l, li) => {
          const { target, rel } = linkAttrs(l.url, l.target, l.rel);
          return (
            <Box
              key={li}
              component="a"
              href={l.url}
              target={target}
              rel={rel}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                py: 1.25,
                px: 1.5,
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 1,
                transition: 'background-color 0.15s ease',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.55)' },
                '&:focus-visible': (t2) => ({
                  outline: `2px solid ${t2.palette.primary.main}`,
                  outlineOffset: 2,
                }),
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  p: 0.75,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(196, 221, 252, 0.55)',
                  borderRadius: 1,
                  border: '1px solid rgba(160, 200, 245, 0.6)',
                  boxSizing: 'border-box',
                }}
              >
                <Box
                  component="img"
                  src={l.image.src}
                  alt={tDock(l.image.alt || '')}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                  {tDock(l.title)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                  {tDock(l.description)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

    </Box>
  );
}

function MobileMega({
  megaMenu,
}: {
  megaMenu: MegaMenuProps;
}) {
  const { t: tMobile } = useTranslate();
  const allLinks = megaMenu.categoryLinks.flatMap((group) => group.links);
  return (
    <Box
      sx={{
        py: 1,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        alignContent: 'start',
        gap: 0.5,
      }}
    >
      {allLinks.map((l, li) => {
        const { target, rel } = linkAttrs(l.url, l.target, l.rel);
        return (
          <Box
            key={li}
            component="a"
            href={l.url}
            target={target}
            rel={rel}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              py: 1.25,
              px: 1.5,
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: 1,
              transition: 'background-color 0.15s ease',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.55)' },
              '&:focus-visible': (t2) => ({
                outline: `2px solid ${t2.palette.primary.main}`,
                outlineOffset: 2,
              }),
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                p: 0.75,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(196, 221, 252, 0.55)',
                borderRadius: 1,
                border: '1px solid rgba(160, 200, 245, 0.6)',
                boxSizing: 'border-box',
              }}
            >
              <Box
                component="img"
                src={l.image.src}
                alt={tMobile(l.image.alt || '')}
                sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                {tMobile(l.title)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {tMobile(l.description)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

const topLineVariants = {
  open: { translateY: 6, transition: { delay: 0.1 } },
  rotatePhase: { rotate: -45, transition: { delay: 0.2 } },
  closed: { translateY: 0, rotate: 0, transition: { duration: 0.2 } },
};

const middleLineVariants = {
  open: { width: 0, transition: { duration: 0.1 } },
  closed: { width: '1.0rem', transition: { delay: 0.3, duration: 0.2 } },
};

const bottomLineVariants = {
  open: { translateY: -6, transition: { delay: 0.1 } },
  rotatePhase: { rotate: 45, transition: { delay: 0.2 } },
  closed: { translateY: 0, rotate: 0, transition: { duration: 0.2 } },
};

NormalNavbar.displayName = 'NormalNavbar';