'use client';

import type { ButtonProps as MUIButtonProps } from '@mui/material';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { usePathname } from '@/routes/hooks';
import { m, AnimatePresence } from 'framer-motion';
import React, { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  GROUP_ACCENTS,
  GROUP_ACCENTS_DARK,
  groupAccentByIndex,
  groupAccentDarkByIndex,
} from '@/theme/accents';

import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Button, IconButton, Typography, useMediaQuery } from '@mui/material';

import { Logo } from '@/components/template/logo';


const FEATURED_ACCENT = GROUP_ACCENTS[5] ?? '#FFB020';
const FEATURED_ACCENT_TEXT = GROUP_ACCENTS_DARK[5] ?? groupAccentDarkByIndex(5);

const NAV_ITEMS: { url: string; label: string }[] = [
  { url: paths.invest, label: 'Invest' },
  { url: paths.portfolio, label: 'Portfolio' },
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
  featuredSections: { title: string; links: MegaMenuLink[] };
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
        backgroundColor: theme.palette.background.paper,
        minHeight: { xs: 64, lg: 72 },
        px: { xs: 2, lg: 2 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr auto', lg: 'auto 1fr auto' },
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

        {/* Column 2: All nav links — desktop only, centered */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
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
                  fontWeight: pathname.startsWith(item.url) ? 600 : 400,
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
                      fontWeight: 400,
                    }}
                  >
                    {t(link.title)}
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

      <DesktopDock
        open={isDesktop && dockOpen && !!activeMega}
        onMouseEnter={() => clearTimer()}
        onMouseLeave={() => scheduleClose()}
      >
        {activeMega && <DockContent mega={activeMega} />}
      </DesktopDock>

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
            <Box sx={{ height: '100%', overflow: 'auto', px: '5%', py: 2 }}>
              {links
                .filter((l) => !!l.megaMenu)
                .map((link, i) => (
                  <MobileMega key={i} megaMenu={link.megaMenu!} />
                ))}
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
        left: 0,
        right: 0,
        top: '100%',
        zIndex: theme.zIndex.appBar + 1,
      }}
    >
      <Box
        sx={{
          px: 2,
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
  const { t: tDock } = useTranslate();

  const href = mega.button.href;
  const isExternal = !!href && /^https?:\/\//i.test(href);

  const btnDefaults = {
    component: mega.button.component ?? (href ? 'a' : undefined),
    target: mega.button.target ?? (isExternal ? '_blank' : undefined),
    rel:
      mega.button.rel ??
      ((mega.button.target ?? (isExternal ? '_blank' : '')) === '_blank'
        ? 'noopener noreferrer'
        : undefined),
  };

  return (
    <Box sx={{ display: 'flex', gap: { xs: 2, lg: 4 }, alignItems: 'stretch' }}>
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
          columnGap: { xs: 2, md: 2 },
          rowGap: { xs: 4, md: 4 },
          pr: { lg: 3 },
          py: 4,
          px: 2,
          '@media (min-width: 900px)': { gridTemplateColumns: 'repeat(2, minmax(0, 320px))' },
          '@media (min-width: 1200px)': { gridTemplateColumns: 'repeat(3, minmax(0, 320px))' },
          '@media (min-width: 1440px)': { gridTemplateColumns: 'repeat(4, minmax(0, 320px))' },
          '@media (min-width: 1600px)': { gridTemplateColumns: 'repeat(5, minmax(0, 320px))' },
        }}
      >
        {mega.categoryLinks.map((group, gi) => {
          const accent = groupAccentByIndex(gi);
          const accentText = groupAccentDarkByIndex(gi);
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
                  sx={{ lineHeight: 1.3, color: accentText }}
                >
                  {tDock(group.title)}
                </Typography>
              </Box>
              {group.links.map((l, li) => {
                const { target, rel } = linkAttrs(l.url, l.target, l.rel);
                return (
                  <Box
                    key={li}
                    component="a"
                    href={l.url}
                    target={target}
                    rel={rel}
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
                      '&:hover': { backgroundColor: (t2) => t2.palette.grey[200] },
                      '&:focus-visible': (t2) => ({
                        outline: `2px solid ${t2.palette.primary.main}`,
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
                        border: (t2) => `1px solid ${t2.palette.divider}`,
                        boxSizing: 'border-box',
                      }}
                    >
                      <Box
                        component="img"
                        src={l.image.src}
                        alt={tDock(l.image.alt || '')}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" fontWeight={700}>
                        {tDock(l.title)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tDock(l.description)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{ flex: 1, position: 'relative', maxWidth: { lg: 448 }, px: { xs: 2, md: 3 }, py: 4 }}
      >
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
              sx={{ lineHeight: 1.3, color: FEATURED_ACCENT_TEXT }}
            >
              {tDock(mega.featuredSections.title)}
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
                    alt={tDock(item.image.alt || '')}
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
                    {tDock(item.title)}
                  </Typography>
                  <Typography variant="body2">{tDock(item.description)}</Typography>
                  {item.button && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="text"
                        size="small"
                        sx={{ textDecoration: 'underline', p: 0, minWidth: 0 }}
                        endIcon={<ChevronRightIcon />}
                        {...item.button}
                      >
                        {tDock(item.button.title)}
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
              {...btnDefaults}
              {...mega.button}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'none',
                  backgroundColor: (t2) => t2.palette.action.hover,
                },
                '&:link, &:visited': { color: 'text.primary' },
              }}
            >
              {tDock(mega.button.title)}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100vw',
            left: { xs: 0, lg: 'calc(-5% - 0px)' },
            bgcolor: (t2) => t2.palette.grey[100],
            zIndex: 0,
          }}
        />
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
  const href = megaMenu.button.href;
  const isExternal = !!href && /^https?:\/\//i.test(href);
  const btnDefaults = {
    component: megaMenu.button.component ?? (href ? 'a' : undefined),
    target: megaMenu.button.target ?? (isExternal ? '_blank' : undefined),
    rel:
      megaMenu.button.rel ??
      ((megaMenu.button.target ?? (isExternal ? '_blank' : '')) === '_blank'
        ? 'noopener noreferrer'
        : undefined),
  };
  return (
    <Box sx={{ py: 0 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' },
          columnGap: 2,
          rowGap: 4,
        }}
      >
        {megaMenu.categoryLinks.map((group, gi) => {
          const accent = groupAccentByIndex(gi);
          const accentText = groupAccentDarkByIndex(gi);
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
                  mb: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={400}
                  sx={{ lineHeight: 1.3, color: accentText }}
                >
                  {tMobile(group.title)}
                </Typography>
              </Box>

              {group.links.map((l, li) => {
                const { target, rel } = linkAttrs(l.url, l.target, l.rel);
                return (
                  <Box
                    key={li}
                    component="a"
                    href={l.url}
                    target={target}
                    rel={rel}
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
                      '&:hover': { backgroundColor: (t2) => t2.palette.grey[200] },
                      '&:focus-visible': (t2) => ({
                        outline: `2px solid ${t2.palette.primary.main}`,
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
                        border: (t2) => `1px solid ${t2.palette.divider}`,
                        boxSizing: 'border-box',
                      }}
                    >
                      <Box
                        component="img"
                        src={l.image.src}
                        alt={tMobile(l.image.alt || '')}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" fontWeight={700}>
                        {tMobile(l.title)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tMobile(l.description)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ mt: 3, position: 'relative', py: 4 }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '-5%',
            right: '-5%',
            bgcolor: (t2) => t2.palette.grey[100],
            zIndex: 0,
          }}
        />
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
            mb: 1.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={400}
            sx={{ lineHeight: 1.3, color: FEATURED_ACCENT_TEXT }}
          >
            {tMobile(megaMenu.featuredSections.title)}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gap: 2, position: 'relative', zIndex: 1 }}>
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
                  alt={tMobile(item.image.alt || '')}
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
                  {tMobile(item.title)}
                </Typography>
                <Typography variant="body2">{tMobile(item.description)}</Typography>
                {item.button && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="text"
                      size="small"
                      sx={{ textDecoration: 'underline', p: 0, minWidth: 0 }}
                      endIcon={<ChevronRightIcon />}
                      {...item.button}
                    >
                      {tMobile(item.button.title)}
                    </Button>
                  </Box>
                )}
              </Box>
            </a>
          ))}
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button
            {...btnDefaults}
            {...megaMenu.button}
            fullWidth
            sx={{
              bgcolor: '#2b2b2b',
              color: '#fff',
              justifyContent: 'center',
              textAlign: 'center',
              fontWeight: 500,
              borderRadius: 1.5,
              py: 3,
              '&:hover': {
                bgcolor: '#1f1f1f',
              },
            }}
          >
            {tMobile(megaMenu.button.title)}
          </Button>
        </Box>
      </Box>
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