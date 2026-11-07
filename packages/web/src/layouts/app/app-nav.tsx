import type { ReactNode } from 'react';

import { paths } from '@/routes/paths';

import HomeOutlined from '@mui/icons-material/HomeOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';

// ----------------------------------------------------------------------

export type AppNavItem = {
  title: string;
  href: string;
  icon: ReactNode;
  /** Opens in a new tab and is never "current". */
  external?: boolean;
  /** Home matches only itself; the rest also own their sub-pages. */
  exact?: boolean;
};

/** The sidebar's main group, and the phone's bottom tabs. */
export const APP_NAV_MAIN: AppNavItem[] = [
  { title: 'Home', href: paths.portfolio, icon: <HomeOutlined />, exact: true },
  { title: 'Assets', href: paths.assets.root, icon: <AccountBalanceWalletOutlined /> },
  { title: 'Activity', href: paths.activity, icon: <ReceiptLongOutlined /> },
  { title: 'Savings', href: paths.savings, icon: <SavingsOutlined /> },
  { title: 'Swap', href: paths.swap, icon: <SwapHorizOutlined /> },
];

export const APP_NAV_SECONDARY: AppNavItem[] = [
  { title: 'Settings', href: paths.settings, icon: <SettingsOutlined /> },
  { title: 'Help', href: paths.docs, icon: <HelpOutlineOutlined />, external: true },
];

export type AppNavGroup = {
  /** A small grey label over the group; the first group has none. */
  title?: string;
  items: AppNavItem[];
};

const [HOME, ASSETS, ACTIVITY, SAVINGS, SWAP] = APP_NAV_MAIN;
const [SETTINGS, HELP] = APP_NAV_SECONDARY;

/** The desktop sidebar, in groups: your money, what Normal does with it, your account. */
export const APP_NAV_GROUPS: AppNavGroup[] = [
  { items: [HOME, ASSETS, ACTIVITY] },
  { title: 'Products', items: [SAVINGS, SWAP] },
  { title: 'Account', items: [SETTINGS, HELP] },
];

export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  if (item.external) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
