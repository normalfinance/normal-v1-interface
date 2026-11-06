'use client';

import { paths } from '@/routes/paths';
import { usePathname } from '@/routes/hooks';
import { RouterLink } from '@/routes/components';
import { useRef, useState, useEffect } from 'react';
import { INK, HOVER, MUTED, PAPER, CANVAS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuRounded from '@mui/icons-material/MenuRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';

import { Logo } from '@/components/template/logo';
import { FrameLines } from '@/components/_common/frame-lines';
import {
  Eyebrow,
  HAIRLINE,
  COLUMN_SX,
  GUTTER_SX,
  INK_BUTTON_SX,
  OUTLINED_BUTTON_SX,
} from '@/components/_common/brand';

import { NAV_LINKS, NAV_MENUS } from './site-nav';
import { ThemeToggleButton } from './theme-toggle';
import { useSessionHint } from './use-session-hint';

import type { SessionHint } from './use-session-hint';
import type { NavMenu, SiteLink, NavMenuLink } from './site-nav';

// ----------------------------------------------------------------------

const NAV_BUTTON_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  minWidth: 0,
  px: '12px',
  py: '6px',
  fontSize: 14,
  fontWeight: 500,
  color: INK,
  borderRadius: 'var(--radius-md)',
  '&:hover': { bgcolor: HOVER },
} as const;

/** A link that may leave the site: external ones open in a new tab. */
const linkProps = (link: SiteLink) =>
  link.external
    ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
    : { component: RouterLink, href: link.href };

// ----------------------------------------------------------------------

function MenuLinkRow({ link, onNavigate }: { link: NavMenuLink; onNavigate: () => void }) {
  const Icon = link.icon;

  return (
    <Box
      component="a"
      {...linkProps(link)}
      onClick={onNavigate}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        px: '12px',
        py: '9px',
        color: 'inherit',
        textDecoration: 'none',
        borderRadius: 'var(--radius-md)',
        '&:hover': { bgcolor: HOVER },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 34,
          height: 34,
          border: HAIRLINE,
          borderRadius: 'var(--radius-md)',
          bgcolor: CANVAS,
        }}
      >
        <Icon sx={{ fontSize: 18, color: INK }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: INK }}>{link.label}</Typography>
        <Typography sx={{ fontSize: 12.5, color: MUTED }}>{link.description}</Typography>
      </Box>
    </Box>
  );
}

function MenuBanner({ banner, onNavigate }: { banner: NavMenu['banner']; onNavigate: () => void }) {
  if (banner.image) {
    return (
      <Box
        component="a"
        {...linkProps(banner)}
        onClick={onNavigate}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          p: '12px 14px',
          color: 'inherit',
          textDecoration: 'none',
          borderTop: HAIRLINE,
          '&:hover': { bgcolor: HOVER },
        }}
      >
        <Box
          component="img"
          src={banner.image}
          alt=""
          sx={{
            width: 60,
            height: 42,
            flexShrink: 0,
            objectFit: 'cover',
            borderRadius: 'var(--radius-sm)',
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 500, color: INK }}>
            {banner.title}
          </Typography>
          {banner.meta && (
            <Typography sx={{ fontSize: 12, color: MUTED }}>{banner.meta}</Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: '14px 16px',
        borderTop: HAIRLINE,
        bgcolor: CANVAS,
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: INK }}>{banner.title}</Typography>
        {banner.subtitle && (
          <Typography sx={{ fontSize: 12.5, color: MUTED }}>{banner.subtitle}</Typography>
        )}
      </Box>
      <Button
        {...linkProps(banner)}
        onClick={onNavigate}
        variant="contained"
        size="small"
        sx={INK_BUTTON_SX}
      >
        {banner.label}
      </Button>
    </Box>
  );
}

function MenuGroups({ menu, onNavigate }: { menu: NavMenu; onNavigate: () => void }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { md: 'repeat(2, 1fr)' }, gap: 0.5, p: 1 }}>
      {menu.groups.map((group) => (
        <Box key={group.title}>
          <Eyebrow sx={{ px: '12px', pt: 1, pb: 0.5, color: MUTED }}>{group.title}</Eyebrow>
          {group.links.map((link) => (
            <MenuLinkRow key={link.label} link={link} onNavigate={onNavigate} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

/** The dropdown under a menu button. It fades in place; nothing slides. */
function Dock({
  open,
  menu,
  onNavigate,
}: {
  open: boolean;
  menu: NavMenu;
  onNavigate: () => void;
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        zIndex: (theme) => theme.zIndex.appBar + 1,
        width: 520,
        overflow: 'hidden',
        border: HAIRLINE,
        borderRadius: 'var(--radius-lg)',
        bgcolor: PAPER,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        transition: 'opacity 120ms, visibility 120ms',
      }}
    >
      <MenuGroups menu={menu} onNavigate={onNavigate} />
      <MenuBanner banner={menu.banner} onNavigate={onNavigate} />
    </Box>
  );
}

function Avatar({ session, size = 22 }: { session: SessionHint; size?: number }) {
  if (session.avatarUrl) {
    return (
      <Box
        component="img"
        src={session.avatarUrl}
        alt=""
        sx={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        fontSize: Math.round(size * 0.5),
        fontWeight: 500,
        color: INK,
        bgcolor: PAPER,
      }}
    >
      {(session.name ?? 'N').trim().charAt(0).toUpperCase()}
    </Box>
  );
}

// ----------------------------------------------------------------------

/**
 * The marketing header: the mark, the Product and Resources dropdowns, and on
 * the right either sign-in or, when signed in, the way back to the dashboard
 * with the user's avatar on it; the light/dark switch beside it. A solid
 * page-coloured bar: nothing scrolls under it.
 */
export function SiteHeader() {
  const session = useSessionHint();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeAll = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const primary = session.signedIn ? (
    <Button
      component={RouterLink}
      href={paths.portfolio}
      variant="contained"
      size="medium"
      startIcon={<Avatar session={session} />}
      sx={INK_BUTTON_SX}
    >
      Dashboard
    </Button>
  ) : (
    <Button
      component={RouterLink}
      href={paths.auth.signup}
      variant="contained"
      size="medium"
      sx={INK_BUTTON_SX}
    >
      Open account
    </Button>
  );

  return (
    <Box
      ref={headerRef}
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: PAPER,
        borderBottom: HAIRLINE,
      }}
    >
      <FrameLines />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          height: { xs: 64, md: 72 },
          ...COLUMN_SX,
          ...GUTTER_SX,
        }}
      >
        <Logo sx={{ width: 32, height: 32, mr: { md: 2 } }} onClick={closeAll} />

        <Box
          component="nav"
          aria-label="Main"
          sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}
        >
          {NAV_MENUS.map((menu) => {
            const open = openMenu === menu.label;
            return (
              <Box key={menu.label} sx={{ position: 'relative' }}>
                <Button
                  aria-expanded={open}
                  onClick={() => setOpenMenu(open ? null : menu.label)}
                  sx={[NAV_BUTTON_SX, open && { bgcolor: HOVER }]}
                >
                  {menu.label}
                  <ExpandMoreRounded
                    sx={{ fontSize: 18, color: MUTED, transform: open ? 'rotate(180deg)' : 'none' }}
                  />
                </Button>
                <Dock open={open} menu={menu} onNavigate={closeAll} />
              </Box>
            );
          })}
          {NAV_LINKS.map((link) => (
            <Button key={link.label} {...linkProps(link)} onClick={closeAll} sx={NAV_BUTTON_SX}>
              {link.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {!session.signedIn && (
          <Button
            component={RouterLink}
            href={paths.auth.login}
            sx={[NAV_BUTTON_SX, { display: { xs: 'none', md: 'inline-flex' } }]}
          >
            Log in
          </Button>
        )}
        <ThemeToggleButton />
        {primary}

        <IconButton
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="site-menu"
          onClick={() => setMobileOpen((open) => !open)}
          sx={{ display: { md: 'none' }, color: INK }}
        >
          {mobileOpen ? <CloseRounded /> : <MenuRounded />}
        </IconButton>
      </Box>

      {mobileOpen && (
        <Box
          id="site-menu"
          component="nav"
          aria-label="Main"
          sx={{
            display: { md: 'none' },
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 'calc(100dvh - 64px)',
            overflowY: 'auto',
            pb: 2,
            bgcolor: PAPER,
            borderBottom: HAIRLINE,
          }}
        >
          <FrameLines />
          <Box sx={COLUMN_SX}>
            {NAV_MENUS.map((menu) => (
              <MenuGroups key={menu.label} menu={menu} onNavigate={closeAll} />
            ))}
            <Box sx={{ display: 'grid', gap: 1, px: 2, pt: 1, borderTop: HAIRLINE }}>
              {NAV_LINKS.map((link) => (
                <Button key={link.label} {...linkProps(link)} onClick={closeAll} sx={NAV_BUTTON_SX}>
                  {link.label}
                </Button>
              ))}
              {!session.signedIn && (
                <Button
                  component={RouterLink}
                  href={paths.auth.login}
                  variant="outlined"
                  size="large"
                  sx={OUTLINED_BUTTON_SX}
                >
                  Log in
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
