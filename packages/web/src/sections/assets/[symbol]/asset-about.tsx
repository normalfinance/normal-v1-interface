'use client';

import { useTranslate } from '@/locales';
import { INK, MUTED, INK_SOFT } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';

import { AppBlock, assetNoun } from '@/components/_common/app-ui';

// ----------------------------------------------------------------------

// Each coin in plain words, for people who don't know crypto: what it is, then
// what Normal lets them do with it. Facts only, nothing that goes stale with
// the market (no prices, no "fastest").
const ABOUT: Record<string, { what: string; inNormal: string; website: string }> = {
  BTC: {
    what: 'The first cryptocurrency, running since 2009. No company or government runs it, and there will only ever be 21 million bitcoin, which is why many people hold it for the long term.',
    inNormal:
      'Bitcoin lives on its own network. In Normal you can buy, send, receive, swap and cash it out. Savings holds digital dollars only: swap to them to start earning.',
    website: 'https://bitcoin.org',
  },
  ETH: {
    what: 'A network for apps and digital money, running since 2015. Ether (ETH) pays for every transaction on it, and many apps and digital dollars live on Ethereum.',
    inNormal:
      'Ethereum lives on its own network. In Normal you can buy, send, receive, swap and cash it out. Savings holds digital dollars only: swap to them to start earning.',
    website: 'https://ethereum.org',
  },
  SOL: {
    what: 'A fast network for apps and payments, running since 2020. SOL pays for transactions on it, which usually cost a fraction of a cent.',
    inNormal:
      'Solana lives on its own network. In Normal you can buy, send, receive, swap and cash it out. Savings holds digital dollars only: swap to them to start earning.',
    website: 'https://solana.com',
  },
  XLM: {
    what: 'A network built for moving money around the world, running since 2014. Lumens (XLM) pay the small fee every transaction on it needs.',
    inNormal:
      'Normal runs on Stellar: your digital dollars and your Savings live here, and a little XLM in your wallet covers their fees.',
    website: 'https://stellar.org',
  },
  USDC: {
    what: 'A digital dollar issued by Circle. Each one is backed by cash and short-term US government bonds held in reserve, which keeps its price close to $1.00.',
    inNormal:
      'In Normal, digital dollars are USDC on the Stellar network. They are what Savings holds and earns on.',
    website: 'https://www.circle.com/usdc',
  },
};

function OutLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: 14,
        fontWeight: 500,
        color: INK,
        textUnderlineOffset: '3px',
      }}
    >
      {children}
      <NorthEastRounded sx={{ fontSize: 15, color: MUTED }} />
    </Link>
  );
}

/** What the coin is, what Normal does with it, and where to read more. */
export function AssetAbout({
  symbol,
  explorer,
}: {
  symbol: string;
  /** The holder's own address on the chain's explorer, when they have one. */
  explorer?: { href: string; label: string } | null;
}) {
  const { t } = useTranslate();
  const about = ABOUT[symbol];
  if (!about) return null;

  return (
    <AppBlock title={t('About {{name}}', { name: assetNoun(symbol) })}>
      <Typography sx={{ fontSize: 15, lineHeight: 1.6, color: INK_SOFT }}>
        {t(about.what)}
      </Typography>
      <Typography sx={{ mt: 1.5, fontSize: 15, lineHeight: 1.6, color: INK_SOFT }}>
        {t(about.inNormal)}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1, mt: 2.5 }}>
        <OutLink href={about.website}>
          {new URL(about.website).hostname.replace(/^www\./, '')}
        </OutLink>
        {explorer && <OutLink href={explorer.href}>{explorer.label}</OutLink>}
      </Box>
    </AppBlock>
  );
}
