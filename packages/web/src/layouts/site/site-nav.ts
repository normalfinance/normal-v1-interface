import type { SvgIconComponent } from '@mui/icons-material';

import { cdn } from '@/utils/cdn';
import { paths } from '@/routes/paths';
import { authHref } from '@/lib/auth/auth-routes';
import { appActionHref } from '@/lib/app-action-url';

import FlagOutlined from '@mui/icons-material/FlagOutlined';
import FeedOutlined from '@mui/icons-material/FeedOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import AddCardOutlined from '@mui/icons-material/AddCardOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import NorthEastOutlined from '@mui/icons-material/NorthEastOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';

// ----------------------------------------------------------------------

export type SiteLink = { label: string; href: string; external?: boolean };

export type NavMenuLink = SiteLink & {
  description: string;
  icon: SvgIconComponent;
  /** A page of the app: signed out, the link goes through login and back (`menusFor`). */
  app?: boolean;
};

export type NavMenu = {
  label: string;
  groups: { title: string; links: NavMenuLink[] }[];
  /**
   * The strip at the bottom of the dropdown: an ask, or a post with its
   * picture, on a dark block (Niko 2026-11-10: not plain white or grey, then
   * "just dark").
   */
  banner: SiteLink & {
    title: string;
    subtitle?: string;
    image?: string;
    meta?: string;
  };
};

/** The header's dropdowns. */
export const NAV_MENUS: NavMenu[] = [
  {
    label: 'Product',
    groups: [
      {
        title: 'Money',
        links: [
          {
            label: 'Savings',
            description: 'Earn on your digital dollars.',
            href: paths.savings,
            icon: SavingsOutlined,
            app: true,
          },
          {
            label: 'Add money',
            description: 'Buy with your card or bank.',
            href: appActionHref(paths.portfolio, 'buy'),
            icon: AddCardOutlined,
            app: true,
          },
        ],
      },
      {
        title: 'Crypto',
        links: [
          {
            label: 'Swap',
            description: 'Switch between assets.',
            href: paths.swap,
            icon: SwapHorizOutlined,
            app: true,
          },
          {
            label: 'Send',
            description: 'Pay anyone, anywhere.',
            href: appActionHref(paths.portfolio, 'send'),
            icon: NorthEastOutlined,
            app: true,
          },
        ],
      },
    ],
    banner: {
      title: 'Open your account in minutes',
      subtitle: 'Free to open. Only the assets that matter.',
      label: 'Get started',
      href: paths.auth.signup,
    },
  },
  {
    label: 'Resources',
    groups: [
      {
        title: 'Learn',
        links: [
          {
            label: 'Docs',
            description: 'How Normal works.',
            href: paths.docs,
            icon: ArticleOutlined,
            external: true,
          },
          {
            label: 'Help',
            description: 'Ask us on Discord.',
            href: paths.help.feedbackForm,
            icon: HelpOutlineOutlined,
            external: true,
          },
        ],
      },
      {
        title: 'Company',
        links: [
          {
            label: 'About',
            description: 'Our mission and team.',
            href: paths.core.about,
            icon: PeopleOutlined,
          },
          {
            label: 'Roadmap',
            description: 'Where we are going.',
            href: paths.core.roadmap,
            icon: FlagOutlined,
          },
          {
            label: 'Blog',
            description: 'News and stories.',
            href: paths.blog,
            icon: FeedOutlined,
            external: true,
          },
          {
            label: 'Contact',
            description: 'Talk to the team.',
            href: paths.core.contact,
            icon: MailOutlined,
          },
        ],
      },
    ],
    banner: {
      title: 'Making crypto Normal: simple, safe and stable',
      meta: '5 min read',
      image: cdn('blog/6aceaec9-3a28-4c77-b830-40111bd8dc83_5824x4192.webp'),
      label: 'Read',
      href: 'https://normalfi.substack.com/p/making-crypto-normal-simple-safe',
      external: true,
    },
  },
];

/**
 * The menus for the visitor: the Product links open the app's own pages (Niko
 * 2026-11-10), straight there when signed in, through login and back when not
 * (login's `next`; AppShell does the same for anyone who lands on /app).
 */
export function menusFor(signedIn: boolean): NavMenu[] {
  if (signedIn) return NAV_MENUS;
  return NAV_MENUS.map((menu) => ({
    ...menu,
    groups: menu.groups.map((group) => ({
      ...group,
      links: group.links.map((link) =>
        link.app ? { ...link, href: authHref('login', link.href) } : link
      ),
    })),
  }));
}

/** Plain links beside the dropdowns. */
export const NAV_LINKS: SiteLink[] = [
  { label: 'Savings', href: paths.site.savings },
  { label: 'Security', href: paths.site.security },
];

export const FOOTER_COLUMNS: { title: string; links: SiteLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Savings', href: paths.site.savings },
      { label: 'Add money', href: paths.site.buy },
      { label: 'Swap', href: paths.site.swap },
      { label: 'Send', href: paths.site.wallet },
      { label: 'Security', href: paths.site.security },
      { label: 'Open the app', href: paths.portfolio },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: paths.core.about },
      { label: 'Roadmap', href: paths.core.roadmap },
      { label: 'Blog', href: paths.blog, external: true },
      { label: 'Docs', href: paths.docs, external: true },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact us', href: paths.core.contact },
      { label: 'Discord community', href: paths.socials.discord, external: true },
      { label: 'Report a bug', href: paths.help.feedbackForm, external: true },
    ],
  },
];

export const LEGAL_LINKS: SiteLink[] = [
  { label: 'Terms', href: paths.legal.tos },
  { label: 'Privacy', href: paths.legal.pp },
  { label: 'Disclaimer', href: paths.legal.disclaimer },
  { label: 'Delete account', href: paths.legal.deleteAccount },
];

export const SOCIAL_LINKS: { label: string; href: string; icon: string }[] = [
  { label: 'X', href: paths.socials.twitter, icon: 'bxl:twitter' },
  { label: 'Discord', href: paths.socials.discord, icon: 'bxl:discord-alt' },
  { label: 'Telegram', href: paths.socials.telegram, icon: 'bxl:telegram' },
  { label: 'Instagram', href: paths.socials.instagram, icon: 'bxl:instagram' },
  { label: 'GitHub', href: paths.socials.github, icon: 'bxl:github' },
];
