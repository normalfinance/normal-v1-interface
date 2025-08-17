'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Box, Button, IconButton, Typography, useMediaQuery } from '@mui/material';
import type { ButtonProps as MUIButtonProps } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { m, AnimatePresence } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Logo } from '@/components/template/logo';
import { GROUP_ACCENTS, groupAccentByIndex } from '@/theme/accents';

const FEATURED_ACCENT = GROUP_ACCENTS[4] ?? '#FFB020';

const linkAttrs = (url: string, target?: React.HTMLAttributeAnchorTarget, rel?: string) => {
  const isExternal = /^https?:\/\//i.test(url);
  const t = target ?? (isExternal ? '_blank' : undefined);
  const r = rel ?? (t === '_blank' ? 'noopener noreferrer' : undefined);
  return { target: t, rel: r };
};

export type NavButton = Omit<MUIButtonProps, 'children'> & {
  title: string;
};

type ImageProps = {
  url?: string;
  src: string;
  alt?: string;
};

type MegaMenuLink = {
  url: string;
  image: ImageProps;
  title: string;
  description: string;
  button?: NavButton;
};

type CategoryLink = {
  title: string;
  links: MegaMenuLink[];
};

type MegaMenuProps = {
  categoryLinks: CategoryLink[];
  featuredSections: {
    title: string;
    links: MegaMenuLink[];
  };
  button: NavButton;
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
  searchbar?: React.ReactNode;
  language?: React.ReactNode;
  account?: React.ReactNode;
}

export type NormalNavbarProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const NormalNavbar: React.FC<NormalNavbarProps> = (props) => {
  const { logo, links = [], buttons = [], searchbar, language, account } = props;
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // Desktop dock (mega menu)
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

  const activeMega = useMemo(
    () => (activeIdx != null ? (links[activeIdx]?.megaMenu ?? null) : null),
    [activeIdx, links]
  );

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

  // Mobile overlay
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = () => setMobileOpen((p) => !p);
  const closeMobile = () => setMobileOpen(false);

  // Lock body scroll when mobile panel is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  // Open from under header, calculate height
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
    return () => ro.disconnect();
  }, []);

  return (
    <Box
      component="section"
      id="normal-navbar"
      ref={headerRef}
      sx={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        minHeight: { xs: 64, lg: 72 },
        px: { xs: 2, lg: 2 },
      }}
    >
      {/* Row: logo | search (desktop) | right cluster */}
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          // was: { xs: '1fr auto', lg: 'auto 1fr auto' }
          gridTemplateColumns: { xs: '1fr auto', lg: '1fr minmax(160px, 200px) 1fr' },
          alignItems: 'center',
          columnGap: 2,
        }}
      >
        {/* Left: Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Logo isSingle={false} sx={{ display: 'inline-flex', height: 28 }} />
        </Box>

        {/* Middle: DESKTOP searchbar — perfectly centered */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Keep the bar from stretching; center it */}
          <Box sx={{ width: '100%', maxWidth: 200, mx: 'auto' }}>{searchbar}</Box>
        </Box>

        {/* Right: links + language + account + hamburger */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
          {/* DESKTOP links */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center' }}>
            {links.map((link, i) => {
              const hasMega = !!link.megaMenu;
              const { target, rel } = linkAttrs(link.url, link.target, link.rel);

              if (hasMega) {
                return (
                  <Box
                    key={i}
                    onMouseEnter={() => openDock(i)}
                    onMouseLeave={() => scheduleClose()}
                  >
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        openDock(i);
                      }}
                      endIcon={<ExpandMoreIcon />}
                      sx={{
                        textTransform: 'none',
                        py: 1,
                        px: 1.5,
                        color: 'text.primary',
                        fontWeight: 400,
                      }}
                    >
                      {link.title}
                    </Button>
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
                      fontWeight: 400,
                    }}
                  >
                    {link.title}
                  </Button>
                </Box>
              );
            })}
          </Box>

          {/* DESKTOP language + account */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1 }}>
            {language}
            {account}
          </Box>

          {/* MOBILE hamburger (unchanged) */}
          <IconButton
            onClick={toggleMobile}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            sx={{ display: { xs: 'inline-flex', lg: 'none' }, width: 48, height: 48, p: 0 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <m.span
                style={{
                  display: 'block',
                  width: '1.5rem',
                  height: 2,
                  background: '#000',
                  margin: '3px 0',
                }}
                animate={mobileOpen ? ['open', 'rotatePhase'] : 'closed'}
                variants={topLineVariants}
              />
              <m.span
                style={{
                  display: 'block',
                  width: '1.5rem',
                  height: 2,
                  background: '#000',
                  margin: '3px 0',
                }}
                animate={mobileOpen ? 'open' : 'closed'}
                variants={middleLineVariants}
              />
              <m.span
                style={{
                  display: 'block',
                  width: '1.5rem',
                  height: 2,
                  background: '#000',
                  margin: '3px 0',
                }}
                animate={mobileOpen ? ['open', 'rotatePhase'] : 'closed'}
                variants={bottomLineVariants}
              />
            </Box>
          </IconButton>
        </Box>
      </Box>

      {/* DESKTOP: full-width dropdown dock */}
      <DesktopDock
        open={isDesktop && dockOpen && !!activeMega}
        onMouseEnter={() => clearTimer()}
        onMouseLeave={() => scheduleClose()}
      >
        {activeMega && <DockContent mega={activeMega} />}
      </DesktopDock>

      {/* MOBILE: fixed overlay with height animation */}
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
              background: theme.palette.background.paper,
              overflow: 'hidden',
            }}
            aria-modal="true"
            role="dialog"
          >
            {/* Scrollable content only, no extra header */}
            <Box sx={{ height: '100%', overflow: 'auto', px: '5%', py: 2 }}>
              {links.map((link, i) => {
                const hasMega = !!link.megaMenu;
                if (hasMega)
                  return <MobileMega key={i} title={link.title} megaMenu={link.megaMenu!} />;
                return (
                  <a
                    key={i}
                    href={link.url}
                    style={{
                      display: 'block',
                      padding: '12px 0',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.title}
                  </a>
                );
              })}

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  mt: 2,
                  gap: 2,
                  pb: 6,
                }}
              >
                {buttons.map((button, idx) => (
                  <Button key={idx} fullWidth {...button} />
                ))}
              </Box>
            </Box>
          </m.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

/* ---------------------------- DESKTOP DOCK UI ---------------------------- */

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
        left: 0,
        right: 0,
        top: '100%',
        zIndex: theme.zIndex.appBar + 1,
      }}
    >
      <Box
        sx={{
          px: '5%',
          py: 3,
          borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
          borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
          bgcolor: theme.palette.background.paper,
          boxShadow: `0 16px 40px ${alpha('#000', 0.14)}`,
        }}
      >
        {children}
      </Box>
    </m.div>
  );
}

function DockContent({ mega }: { mega: MegaMenuProps }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 2, lg: 4 },
        alignItems: 'stretch',
        py: 1,
      }}
    >
      {/* Left: category link columns */}
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
          columnGap: { xs: 2, md: 4 },
          rowGap: { xs: 2, md: 3 },
          pr: { lg: 3 },
        }}
      >
        {mega.categoryLinks.map((group, gi) => {
          const accent = groupAccentByIndex(gi);
          return (
            <Box
              key={gi}
              sx={{ display: 'grid', gridAutoRows: 'max-content', rowGap: { xs: 1, md: 2 } }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: alpha(accent, 0.1),
                  width: 'fit-content',
                  whiteSpace: 'nowrap',
                  alignSelf: 'start',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={400}
                  sx={{ lineHeight: 1.3, color: accent }}
                >
                  {group.title}
                </Typography>
              </Box>
              {group.links.map((l, li) => (
                <Box
                  key={li}
                  component="a"
                  href={l.url}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'max-content 1fr',
                    alignItems: 'start',
                    columnGap: '12px',
                    py: 1,
                    px: 1,
                    textDecoration: 'none',
                    color: 'inherit',
                    borderRadius: 1,
                    transition: 'background-color 0.15s ease',
                    '&:hover': {
                      backgroundColor: (t) => t.palette.grey[200],
                    },
                    '&:focus-visible': (t) => ({
                      outline: `2px solid ${t.palette.primary.main}`,
                      outlineOffset: 2,
                    }),
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      p: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#F9FAFB',
                      borderRadius: 1,
                      border: (t) => `1px solid ${t.palette.divider}`,
                      boxSizing: 'border-box',
                    }}
                  >
                    <Box
                      component="img"
                      src={l.image.src}
                      alt={l.image.alt}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight={700}>
                      {l.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {l.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>

      {/* Right: featured section */}
      <Box sx={{ flex: 1, position: 'relative', maxWidth: { lg: 448 }, px: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateRows: 'max-content auto max-content',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: alpha(FEATURED_ACCENT, 0.2),
              width: 'fit-content',
              whiteSpace: 'nowrap',
              alignSelf: 'start',
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={400}
              sx={{ lineHeight: 1.3, color: FEATURED_ACCENT }}
            >
              {mega.featuredSections.title}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {mega.featuredSections.links.map((item, k) => (
              <a
                key={k}
                href={item.url}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '0.6fr 1fr',
                  gap: '16px',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '8px 0',
                }}
              >
                <Box sx={{ position: 'relative', width: '100%', pt: '66.66%' }}>
                  <img
                    src={item.image.src}
                    alt={item.image.alt}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 8,
                    }}
                  />
                </Box>
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}
                >
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2">{item.description}</Typography>
                  {item.button && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="text"
                        size="small"
                        sx={{ textDecoration: 'underline', p: 0, minWidth: 0 }}
                        endIcon={<ChevronRightIcon />}
                        {...item.button}
                      >
                        {item.button.title}
                      </Button>
                    </Box>
                  )}
                </Box>
              </a>
            ))}
          </Box>

          <Box
            sx={{ mt: 1 }}
            component="a"
            href="https://normalfi.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              {...mega.button}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'none',
                  backgroundColor: (t) => t.palette.action.hover,
                },
                '&:link, &:visited': { color: 'text.primary' },
              }}
            >
              {mega.button.title}
            </Button>
          </Box>
        </Box>

        {/* Opaque background panel behind the right column */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100vw',
            left: { xs: 0, lg: 'calc(-5% - 0px)' },
            bgcolor: theme.palette.background.paper,
            zIndex: 0,
          }}
        />
      </Box>
    </Box>
  );
}

/* ------------------------------ MOBILE MEGA ------------------------------ */

function MobileMega({ title, megaMenu }: { title: string; megaMenu: MegaMenuProps }) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ borderTop: (t) => `1px solid ${alpha(t.palette.text.primary, 0.06)}` }}>
      <Button
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        endIcon={
          <m.span
            variants={{ rotated: { rotate: 180 }, initial: { rotate: 0 } }}
            animate={open ? 'rotated' : 'initial'}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <ExpandMoreIcon />
          </m.span>
        }
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          textTransform: 'none',
          py: 1.25,
          px: 0,
          color: 'text.primary',
        }}
      >
        {title}
      </Button>

      <m.div
        initial={false}
        animate={open ? 'open' : 'closed'}
        variants={{ open: { height: 'auto', opacity: 1 }, closed: { height: 0, opacity: 0 } }}
        transition={{ duration: 0.3 }}
        style={{ overflow: 'hidden' }}
      >
        {/* Same content layout as desktop, stacked / responsive */}
        <Box sx={{ py: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            {megaMenu.categoryLinks.map((group, gi) => (
              <Box key={gi} sx={{ display: 'grid', gridAutoRows: 'max-content', rowGap: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {group.title}
                </Typography>
                {group.links.map((l, li) => (
                  <a
                    key={li}
                    href={l.url}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'max-content 1fr',
                      alignItems: 'start',
                      columnGap: '12px',
                      padding: '8px 0',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={l.image.src}
                        alt={l.image.alt}
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {l.title}
                      </Typography>
                      <Typography variant="body2">{l.description}</Typography>
                    </Box>
                  </a>
                ))}
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {megaMenu.featuredSections.title}
            </Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {megaMenu.featuredSections.links.map((item, k) => (
                <a
                  key={k}
                  href={item.url}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '12px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Box sx={{ position: 'relative', width: '100%', pt: '66.66%' }}>
                    <img
                      src={item.image.src}
                      alt={item.image.alt}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2">{item.description}</Typography>
                    {item.button && (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="text"
                          size="small"
                          sx={{ textDecoration: 'underline', p: 0, minWidth: 0 }}
                          endIcon={<ChevronRightIcon />}
                          {...item.button}
                        >
                          {item.button.title}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </a>
              ))}
            </Box>

            <Box sx={{ mt: 1 }}>
              <Button {...megaMenu.button}>{megaMenu.button.title}</Button>
            </Box>
          </Box>
        </Box>
      </m.div>
    </Box>
  );
}

/* ----------------------------- FRAMER VARIANTS ---------------------------- */

const topLineVariants = {
  open: { translateY: 8, transition: { delay: 0.1 } },
  rotatePhase: { rotate: -45, transition: { delay: 0.2 } },
  closed: { translateY: 0, rotate: 0, transition: { duration: 0.2 } },
};
const middleLineVariants = {
  open: { width: 0, transition: { duration: 0.1 } },
  closed: { width: '1.5rem', transition: { delay: 0.3, duration: 0.2 } },
};
const bottomLineVariants = {
  open: { translateY: -8, transition: { delay: 0.1 } },
  rotatePhase: { rotate: 45, transition: { delay: 0.2 } },
  closed: { translateY: 0, rotate: 0, transition: { duration: 0.2 } },
};

NormalNavbar.displayName = 'NormalNavbar';
