'use client';

import { ease } from '@/theme/motion';
import { paths } from '@/routes/paths';
import { RouterLink } from '@/routes/components';
import { INK, HOVER, MUTED, PAPER, CANVAS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';

import { FrameLines } from '@/components/_common/frame-lines';
import { StoreBadges } from '@/components/_common/store-badges';
import {
  Eyebrow,
  HAIRLINE,
  COLUMN_SX,
  GUTTER_SX,
  INK_BUTTON_SX,
  OUTLINED_BUTTON_SX,
} from '@/components/_common/brand';

import type { SessionHint } from './use-session-hint';
import type { NavLink, NavMenu, SiteLink, NavMenuLink } from './site-nav';

// ----------------------------------------------------------------------

// The header's menu on phones (Niko 2026-11-16: "make sure the mobile menu
// looks 10x better"). The whole screen under the bar, in the site's own
// language: rows and cells divided by hairlines, reaching the frame lines.
//   Product: every product as a row with its icon, what it does and a chevron
//     (Security among them, never a lone word at the foot).
//   Resources: a two-column grid of the smaller links, then the featured post.
//   Get the app: the store badges.
//   Signed out, Log in and Open account close the list.
// It fades in on the one curve and its rows follow a beat apart, opacity only:
// nothing slides (DESIGN.md).

/** A link that may leave the site: external ones open in a new tab. */
const linkProps = (link: SiteLink) =>
  link.external
    ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
    : { component: RouterLink, href: link.href };

/** Rows arrive a beat apart as the menu opens, and all leave together. */
const arrive = (open: boolean, order: number) => ({
  opacity: open ? 1 : 0,
  transition: ease('opacity', 'base', open ? 60 + Math.min(order, 10) * 30 : 0),
});

/** Pressed on a phone, hovered with a mouse: never stuck grey after a tap. */
const PRESS_SX = {
  color: INK,
  textDecoration: 'none',
  transition: ease('background-color', 'quick'),
  '@media (hover: hover)': { '&:hover': { bgcolor: HOVER } },
  '&:active': { bgcolor: HOVER },
  '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
} as const;

function Heading({ children }: { children: string }) {
  return <Eyebrow sx={{ ...GUTTER_SX, pt: 4, pb: 1.5, color: MUTED }}>{children}</Eyebrow>;
}

function ProductRow({
  link,
  order,
  open,
  onNavigate,
}: {
  link: NavMenuLink;
  order: number;
  open: boolean;
  onNavigate: () => void;
}) {
  const Icon = link.icon;

  return (
    <Box component="li" sx={{ borderBottom: HAIRLINE, ...arrive(open, order) }}>
      <Box
        component="a"
        {...linkProps(link)}
        onClick={onNavigate}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          minHeight: 72,
          py: '12px',
          ...GUTTER_SX,
          ...PRESS_SX,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 40,
            height: 40,
            border: HAIRLINE,
            bgcolor: CANVAS,
          }}
        >
          <Icon sx={{ fontSize: 20, color: INK }} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 500, lineHeight: 1.3, color: INK }}>
            {link.label}
          </Typography>
          <Typography sx={{ mt: '2px', fontSize: 13, lineHeight: 1.4, color: MUTED }}>
            {link.description}
          </Typography>
        </Box>
        <ChevronRightRounded sx={{ flexShrink: 0, fontSize: 22, color: MUTED }} />
      </Box>
    </Box>
  );
}

function ResourceCell({
  link,
  index,
  order,
  open,
  onNavigate,
}: {
  link: NavMenuLink;
  index: number;
  order: number;
  open: boolean;
  onNavigate: () => void;
}) {
  const Icon = link.icon;

  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        borderBottom: HAIRLINE,
        borderLeft: index % 2 === 1 ? HAIRLINE : 'none',
        ...arrive(open, order),
      }}
    >
      <Box
        component="a"
        {...linkProps(link)}
        onClick={onNavigate}
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: 60,
          px: 2,
          ...PRESS_SX,
        }}
      >
        <Icon sx={{ flexShrink: 0, fontSize: 20, color: INK }} />
        <Typography sx={{ flexGrow: 1, minWidth: 0, fontSize: 15, fontWeight: 500 }}>
          {link.label}
        </Typography>
        {link.external && <NorthEastRounded sx={{ flexShrink: 0, fontSize: 16, color: MUTED }} />}
      </Box>
    </Box>
  );
}

/** The post the Resources dropdown features, as a dark card: the same block as its foot. */
function FeaturedPost({
  banner,
  order,
  open,
  onNavigate,
}: {
  banner: NavMenu['banner'];
  order: number;
  open: boolean;
  onNavigate: () => void;
}) {
  return (
    <Box sx={{ ...GUTTER_SX, pt: 2, ...arrive(open, order) }}>
      <Box
        component="a"
        {...linkProps(banner)}
        onClick={onNavigate}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          p: '12px',
          color: PAPER,
          bgcolor: INK,
          textDecoration: 'none',
          '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
        }}
      >
        {banner.image && (
          <Box
            component="img"
            src={banner.image}
            alt=""
            sx={{ width: 72, height: 52, flexShrink: 0, objectFit: 'cover' }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 11.5,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'inherit',
              opacity: 0.72,
            }}
          >
            From the blog
          </Typography>
          <Typography
            sx={{ mt: '2px', fontSize: 14, fontWeight: 500, lineHeight: 1.35, color: 'inherit' }}
          >
            {banner.title}
          </Typography>
          {banner.meta && (
            <Typography sx={{ mt: '2px', fontSize: 12.5, color: 'inherit', opacity: 0.72 }}>
              {banner.meta}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function SiteMobileMenu({
  open,
  menus,
  links,
  session,
  onNavigate,
}: {
  open: boolean;
  menus: NavMenu[];
  /** The plain header links not already in a menu (Security). */
  links: NavLink[];
  session: SessionHint;
  onNavigate: () => void;
}) {
  const product = menus.find((menu) => menu.label === 'Product');
  const resources = menus.find((menu) => menu.label === 'Resources');
  const productLinks = [...(product?.groups.flatMap((group) => group.links) ?? []), ...links];
  const resourceLinks = resources?.groups.flatMap((group) => group.links) ?? [];
  // Each block's place in the order they arrive in, top to bottom.
  const resourcesAt = productLinks.length;
  const postAt = resourcesAt + resourceLinks.length + 1;

  return (
    <Box
      id="site-menu"
      component="nav"
      aria-label="Main"
      aria-hidden={!open}
      sx={{
        display: { md: 'none' },
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        height: 'calc(100dvh - 64px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        bgcolor: PAPER,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        transition: ease(['opacity', 'visibility']),
      }}
    >
      {/* The frame lines run the whole list, however far it scrolls. */}
      <Box
        sx={{
          position: 'relative',
          minHeight: '100%',
          pb: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <FrameLines />
        <Box sx={COLUMN_SX}>
          <Heading>Product</Heading>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', borderTop: HAIRLINE }}>
            {productLinks.map((link, index) => (
              <ProductRow
                key={link.label}
                link={link}
                order={index}
                open={open}
                onNavigate={onNavigate}
              />
            ))}
          </Box>

          {resourceLinks.length > 0 && (
            <>
              <Heading>Resources</Heading>
              <Box
                component="ul"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  m: 0,
                  p: 0,
                  listStyle: 'none',
                  borderTop: HAIRLINE,
                }}
              >
                {resourceLinks.map((link, index) => (
                  <ResourceCell
                    key={link.label}
                    link={link}
                    index={index}
                    order={resourcesAt + index}
                    open={open}
                    onNavigate={onNavigate}
                  />
                ))}
              </Box>
              {resources?.banner && (
                <FeaturedPost
                  banner={resources.banner}
                  order={postAt}
                  open={open}
                  onNavigate={onNavigate}
                />
              )}
            </>
          )}

          <Heading>Get the app</Heading>
          <Box sx={{ ...GUTTER_SX, ...arrive(open, postAt + 1) }}>
            <StoreBadges />
          </Box>

          {!session.signedIn && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
                pt: 4,
                ...GUTTER_SX,
                ...arrive(open, postAt + 2),
              }}
            >
              <Button
                component={RouterLink}
                href={paths.auth.login}
                onClick={onNavigate}
                variant="outlined"
                size="large"
                sx={OUTLINED_BUTTON_SX}
              >
                Log in
              </Button>
              <Button
                component={RouterLink}
                href={paths.auth.signup}
                onClick={onNavigate}
                variant="contained"
                size="large"
                sx={INK_BUTTON_SX}
              >
                Open account
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
