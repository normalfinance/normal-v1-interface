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

import { cdn } from '@normalfinance/utils';
import { Iconify } from '@/components/template/iconify';



const NAV_ITEMS: { url: string; label: string }[] = [
  { url: paths.socials.discord, label: 'Discord' },
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

type MegaBanner = {
  badge?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  image?: string;
  buttonLabel: string;
  buttonHref: string;
  buttonTarget?: React.HTMLAttributeAnchorTarget;
};

type MegaMenuProps = {
  categoryLinks: CategoryLink[];
  featuredSections?: { title: string; links: MegaMenuLink[] };
  button?: NavButton;
  banner?: MegaBanner;
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

  useEffect(() => {
    if (isDesktop && mobileOpen) setMobileOpen(false);
  }, [isDesktop, mobileOpen]);

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
        borderBottom: '1px solid rgba(10,10,15,0.04)',
        background: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.92)
          : 'rgba(250,250,251,0.72)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          <Box
            component="a"
            href="/"
            sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, borderRadius: '999px', overflow: 'hidden', p: '6px', transition: 'background 0.15s', '&:hover': { background: 'rgba(10,10,15,0.04)' } }}
          >
            <Box
              component="img"
              src={cdn('logo/logo-single.svg')}
              alt="Normal"
              sx={{ height: 32, width: 'auto' }}
            />
          </Box>
        </Box>

        {/* Column 2: All nav links — desktop only, left-aligned */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {NAV_ITEMS.filter((item) => item.label !== 'Discord').map((item) => (
            <div key={item.url}>
              <Button
                component="a"
                href={item.url}
                sx={{
                  textTransform: 'none',
                  py: 0.5,
                  px: 1.5,
                  color: 'text.primary',
                  fontWeight: pathname.startsWith(item.url) ? 600 : 500,
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
                    sx={{
                      textTransform: 'none',
                      py: '6px',
                      px: '12px',
                      fontSize: '14px',
                      color: 'text.primary',
                      fontWeight: 500,
                      borderRadius: '999px',
                      minWidth: 'unset',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      '&:hover': { background: alpha(theme.palette.text.primary, 0.06) },
                    }}
                  >
                    {t(link.title)}
                    <m.span
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                      animate={dockOpen && activeIdx === i ? 'open' : 'closed'}
                      variants={chevronVariants}
                      transition={{ duration: 0.2 }}
                    >
                      <ExpandMoreIcon sx={{ fontSize: 16, opacity: 0.6 }} />
                    </m.span>
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
                    py: '6px',
                    px: '12px',
                    fontSize: '14px',
                    color: 'text.primary',
                    fontWeight: 500,
                    borderRadius: '999px',
                    minWidth: 'unset',
                    '&:hover': { background: alpha(theme.palette.text.primary, 0.06) },
                  }}
                >
                  {t(link.title)}
                </Button>
              </Box>
            );
          })}
        </Box>

        {/* Column 3: Account controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
          {NAV_ITEMS.filter((item) => item.label === 'Discord').map((item) => (
            <Button
              key={item.url}
              component="a"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: 'text.primary',
                px: '12px',
                py: '6px',
                borderRadius: '999px',
                minWidth: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                '&:hover': { background: alpha(theme.palette.text.primary, 0.06) },
              }}
            >
              <Iconify icon="tabler:brand-discord" width={16} sx={{ opacity: 0.7, flexShrink: 0 }} />
              {t(item.label)}
            </Button>
          ))}
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
              background: theme.palette.background.paper,
              overflow: 'hidden',
            }}
            aria-modal="true"
            role="dialog"
          >
            <Box sx={{ height: '100%', overflow: 'auto', px: '5%', py: 2, display: 'flex', flexDirection: 'column' }}>
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
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: theme.zIndex.appBar + 1,
        marginTop: 6,
      }}
    >
      <Box
        sx={{
          borderRadius: '16px',
          border: `1px solid ${alpha(theme.palette.text.primary, 0.07)}`,
          background: theme.palette.background.paper,
          boxShadow: `0 4px 6px ${alpha('#000', 0.04)}, 0 16px 48px ${alpha('#000', 0.10)}`,
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </m.div>
  );
}

function DockContent({ mega }: { mega: MegaMenuProps }) {
  const { t: tDock } = useTranslate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const topGroups = mega.categoryLinks.slice(0, 2);
  const bottomGroup = mega.categoryLinks[2] ?? null;

  const sectionHeader = (title: string) => (
    <Typography
      sx={{
        display: 'block',
        px: '12px',
        mb: '6px',
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: isDark ? 'rgba(255,255,255,0.35)' : '#9A9AA3',
      }}
    >
      {tDock(title)}
    </Typography>
  );

  const renderLink = (l: MegaMenuLink, li: number) => {
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
          gap: '10px',
          py: '9px',
          px: '12px',
          textDecoration: 'none',
          color: 'inherit',
          borderRadius: '10px',
          transition: 'background 0.15s',
          '&:hover': { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,10,15,0.04)' },
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,10,15,0.05)',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,15,0.08)'}`,
            p: '7px',
          }}
        >
          <Box
            component="img"
            src={l.image.src}
            alt={tDock(l.image.alt || '')}
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 500, lineHeight: 1.3, color: isDark ? '#fff' : '#0A0A0F' }}>
            {tDock(l.title)}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.4)' : '#9A9AA3', lineHeight: 1.4, mt: '2px' }}>
            {tDock(l.description)}
          </Typography>
        </Box>
      </Box>
    );
  };

  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,15,0.07)';

  return (
    <Box sx={{ width: 480 }}>
      {/* Top: two equal columns (Earn | Trade) */}
      <Box sx={{ display: 'flex', pt: '16px', px: '8px' }}>
        {topGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            <Box sx={{ flex: 1, pb: '8px' }}>
              {sectionHeader(group.title)}
              {group.links.map((l, li) => renderLink(l, li))}
            </Box>
            {gi < topGroups.length - 1 && (
              <Box sx={{ width: '1px', bgcolor: dividerColor, mx: '4px', mt: '2px', mb: '12px' }} />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Middle: Support in 2-col grid */}
      {bottomGroup && (
        <>
          <Box sx={{ height: '1px', bgcolor: dividerColor, mx: '16px' }} />
          <Box sx={{ px: '8px', pt: '12px', pb: '8px' }}>
            {sectionHeader(bottomGroup.title)}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {bottomGroup.links.map((l, li) => renderLink(l, li))}
            </Box>
          </Box>
        </>
      )}

      {/* Banner */}
      {mega.banner && (
        <Box
          component={mega.banner.image ? 'a' : 'div'}
          {...(mega.banner.image
            ? { href: mega.banner.buttonHref, target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          sx={{
            m: '8px',
            mt: bottomGroup ? '4px' : '8px',
            p: mega.banner.image ? '10px 12px' : '12px 14px',
            borderRadius: '10px',
            bgcolor: '#0A0A0F',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            ...(mega.banner.image && {
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              '&:hover': { opacity: 0.88 },
            }),
          }}
        >
          {mega.banner.image ? (
            /* Blog-post style */
            <>
              <Box
                component="img"
                src={mega.banner.image}
                alt=""
                sx={{ width: 60, height: 42, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {mega.banner.badge && (
                  <Box sx={{ display: 'inline-flex', px: '7px', py: '2px', mb: '5px', borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.14)' }}>
                    <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
                      {mega.banner.badge}
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', lineHeight: 1.3, mb: '4px' }}>
                  {tDock(mega.banner.title)}
                </Typography>
                {mega.banner.meta && (
                  <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
                    {mega.banner.meta}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ color: '#fff', fontSize: '13px', lineHeight: 1 }}>→</Typography>
              </Box>
            </>
          ) : (
            /* CTA style */
            <>
              {mega.banner.badge && (
                <Box sx={{ px: '10px', py: '4px', borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {mega.banner.badge}
                  </Typography>
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                  {tDock(mega.banner.title)}
                </Typography>
                {mega.banner.subtitle && (
                  <Typography sx={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, mt: '2px' }}>
                    {tDock(mega.banner.subtitle)}
                  </Typography>
                )}
              </Box>
              <Box
                component="a"
                href={mega.banner.buttonHref}
                target={mega.banner.buttonTarget}
                rel={mega.banner.buttonTarget === '_blank' ? 'noopener noreferrer' : undefined}
                sx={{
                  display: 'inline-flex', alignItems: 'center',
                  px: '14px', py: '7px', borderRadius: '999px',
                  bgcolor: '#fff', color: '#0A0A0F',
                  fontSize: '12px', fontWeight: 600,
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'opacity 0.15s', '&:hover': { opacity: 0.85 },
                }}
              >
                {tDock(mega.banner.buttonLabel)}
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

function MobileMega({ megaMenu }: { megaMenu: MegaMenuProps }) {
  const { t: tMobile } = useTranslate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const renderItem = (l: MegaMenuLink, li: number) => {
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
          py: '10px',
          px: '12px',
          textDecoration: 'none',
          color: 'inherit',
          borderRadius: '10px',
          transition: 'background 0.15s',
          '&:hover': { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,10,15,0.04)' },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,10,15,0.05)',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,15,0.08)'}`,
            p: '7px',
          }}
        >
          <Box
            component="img"
            src={l.image.src}
            alt={tMobile(l.image.alt || '')}
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Box>
        <Box>
          <Typography sx={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.3, color: isDark ? '#fff' : '#0A0A0F' }}>
            {tMobile(l.title)}
          </Typography>
          <Typography sx={{ fontSize: '12.5px', color: isDark ? 'rgba(255,255,255,0.4)' : '#9A9AA3', lineHeight: 1.4, mt: '2px' }}>
            {tMobile(l.description)}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {megaMenu.categoryLinks.map((group, gi) => (
        <Box key={gi} sx={{ mb: '16px' }}>
          <Typography
            sx={{
              display: 'block',
              px: '12px',
              mb: '4px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              color: isDark ? 'rgba(255,255,255,0.35)' : '#9A9AA3',
            }}
          >
            {tMobile(group.title)}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
            {group.links.map((l, li) => renderItem(l, li))}
          </Box>
        </Box>
      ))}

      {megaMenu.banner && (
        <Box
          component={megaMenu.banner.image ? 'a' : 'div'}
          {...(megaMenu.banner.image
            ? { href: megaMenu.banner.buttonHref, target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          sx={{
            mt: '4px',
            mb: '20px',
            p: megaMenu.banner.image ? '10px 12px' : '14px 16px',
            borderRadius: '12px',
            bgcolor: '#0A0A0F',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            ...(megaMenu.banner.image && { transition: 'opacity 0.15s', '&:hover': { opacity: 0.88 } }),
          }}
        >
          {megaMenu.banner.image ? (
            <>
              <Box
                component="img"
                src={megaMenu.banner.image}
                alt=""
                sx={{ width: 56, height: 40, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {megaMenu.banner.badge && (
                  <Box sx={{ display: 'inline-flex', px: '7px', py: '2px', mb: '5px', borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.14)' }}>
                    <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
                      {megaMenu.banner.badge}
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: 1.3, mb: '3px' }}>
                  {tMobile(megaMenu.banner.title)}
                </Typography>
                {megaMenu.banner.meta && (
                  <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
                    {megaMenu.banner.meta}
                  </Typography>
                )}
              </Box>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Typography sx={{ color: '#fff', fontSize: '13px', lineHeight: 1 }}>→</Typography>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {megaMenu.banner.badge && (
                  <Box sx={{ px: '10px', py: '4px', borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#fff', lineHeight: 1 }}>
                      {megaMenu.banner.badge}
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                  {tMobile(megaMenu.banner.title)}
                </Typography>
              </Box>
              {megaMenu.banner.subtitle && (
                <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                  {tMobile(megaMenu.banner.subtitle)}
                </Typography>
              )}
              <Box
                component="a"
                href={megaMenu.banner.buttonHref}
                target={megaMenu.banner.buttonTarget}
                rel={megaMenu.banner.buttonTarget === '_blank' ? 'noopener noreferrer' : undefined}
                sx={{
                  display: 'inline-flex', alignItems: 'center', alignSelf: 'stretch',
                  justifyContent: 'center',
                  px: '16px', py: '9px', borderRadius: '999px',
                  bgcolor: '#fff', color: '#0A0A0F',
                  fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s', '&:hover': { opacity: 0.85 },
                }}
              >
                {tMobile(megaMenu.banner.buttonLabel)}
              </Box>
            </Box>
          )}
        </Box>
      )}
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