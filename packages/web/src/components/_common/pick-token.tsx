import type { Token } from '@normalfinance/types';

import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { INK, HOVER, MUTED, PAPER, CANVAS, INK_SOFT, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import SearchRounded from '@mui/icons-material/SearchRounded';

import ModalCloseButton from '@/components/_common/modal-close-button';

import { HAIRLINE } from './brand';
import { AssetAvatar } from './asset-avatar';
import { FIGURES, ROW_LINES, assetName, formatUsd, formatCoin } from './app-ui';

// ---------------------------------------------------------------------------
// Every asset picker in the app (swap, send, withdraw, asset actions): a
// square dialog in the app's own rows (Niko 2026-11-09: the old one, with its
// coloured network chips, had to go). A coin's network is the small circle on
// its icon (AssetAvatar: USDC carries Stellar's), never a coloured badge. What
// you hold comes first, highest value first; the rest follow under a grey band,
// the way the holdings table groups its rows. Full screen on a phone.
// ---------------------------------------------------------------------------

export interface PickTokenProps {
  open: boolean;
  onClose: () => void;
  buttonSource?: string;
  tokens?: Token[];
  onTokenSelect: (token: Token) => void;
}

const SIDE = '20px';

/** A missing price or balance counts as $0. */
const usdValue = (token: Token): BigNumber => {
  const v = BigNumber(token.price || 0).multipliedBy(token.balance || 0);
  return v.isFinite() ? v : BigNumber(0);
};
const owns = (token: Token) => BigNumber(token.balance || 0).gt(0);
// Highest value first (Niko 2026-08-21). The sort is stable, so $0 ties keep
// the curated order.
const byUsdDesc = (a: Token, b: Token) => usdValue(b).comparedTo(usdValue(a)) ?? 0;

/** "Stellar · Lobstr" names on an account with two wallets: the wallet after the dot. */
const ownerOf = (token: Token) =>
  token.name.includes(' · ') ? token.name.split(' · ').slice(1).join(' · ') : null;

function GroupBand({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="h3"
      sx={{
        px: SIDE,
        py: 1,
        fontSize: 13.5,
        fontWeight: 500,
        color: INK_SOFT,
        bgcolor: CANVAS,
      }}
    >
      {children}
    </Typography>
  );
}

function AssetRow({ token, onPick }: { token: Token; onPick: (token: Token) => void }) {
  const held = owns(token);
  const owner = ownerOf(token);
  const amount = held
    ? formatCoin(BigNumber(token.balance).toNumber(), token.symbol)
    : token.symbol;

  return (
    <ButtonBase
      onClick={() => onPick(token)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        width: '100%',
        minHeight: 64,
        px: SIDE,
        py: 1.25,
        textAlign: 'left',
        // Only where there is a pointer: a tap on a phone would leave it grey.
        '@media (hover: hover)': { '&:hover': { bgcolor: HOVER } },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
      }}
    >
      <AssetAvatar token={token} size={40} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 500,
            color: INK,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {assetName(token.symbol)}
        </Typography>
        <Typography
          sx={{
            ...FIGURES,
            mt: '2px',
            fontSize: 13.5,
            color: MUTED,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {[amount, owner].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      {held && (
        <Typography sx={{ ...FIGURES, fontSize: 15, fontWeight: 500, color: INK, flexShrink: 0 }}>
          {formatUsd(usdValue(token).toNumber())}
        </Typography>
      )}
    </ButtonBase>
  );
}

const PickToken: React.FC<PickTokenProps> = ({ open, onClose, tokens = [], onTokenSelect }) => {
  const { t } = useTranslate('auto');
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchTerm, setSearchTerm] = useState('');

  const pick = (token: Token) => {
    onTokenSelect(token);
    setSearchTerm('');
    onClose();
  };

  const term = searchTerm.trim().toLowerCase();
  const matches = tokens
    .filter(
      (token) =>
        token.name.toLowerCase().includes(term) ||
        token.symbol.toLowerCase().includes(term) ||
        assetName(token.symbol).toLowerCase().includes(term)
    )
    .sort(byUsdDesc);
  const owned = tokens.filter(owns).sort(byUsdDesc);
  const others = tokens.filter((token) => !owns(token));

  const list = (rows: Token[]) => (
    <Box sx={ROW_LINES}>
      {rows.map((token) => (
        <AssetRow key={token.contract} token={token} onPick={pick} />
      ))}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={phone}
      aria-labelledby="pick-token-title"
      slotProps={{
        paper: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: phone ? 'none' : 420,
            maxHeight: phone ? 'none' : 'min(640px, calc(100% - 64px))',
            m: phone ? 0 : 2,
            bgcolor: PAPER,
            border: phone ? 'none' : HAIRLINE,
          },
        },
      }}
    >
      {/* Title and close */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          minHeight: 60,
          px: SIDE,
        }}
      >
        <Typography id="pick-token-title" sx={{ fontSize: 17, fontWeight: 500, color: INK }}>
          {t('Choose an asset')}
        </Typography>
        <ModalCloseButton onClick={onClose} />
      </Box>

      {/* Search */}
      <Box sx={{ px: SIDE, pb: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            height: 44,
            px: 1.5,
            border: `1px solid ${HAIRLINE_STRONG}`,
            '&:focus-within': { borderColor: INK },
          }}
        >
          <SearchRounded sx={{ fontSize: 20, color: MUTED }} />
          <InputBase
            fullWidth
            // A phone's keyboard would cover half the list before anyone asked for it.
            autoFocus={!phone}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('Search by name or ticker')}
            inputProps={{ 'aria-label': t('Search assets') }}
            sx={{ fontSize: 15, color: INK }}
          />
        </Box>
      </Box>

      {/* The assets */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', borderTop: HAIRLINE, pb: 1 }}>
        {term ? (
          matches.length ? (
            list(matches)
          ) : (
            <Typography sx={{ px: SIDE, py: 5, fontSize: 14, color: MUTED, textAlign: 'center' }}>
              {t('No asset matches “{{term}}”.', { term: searchTerm.trim() })}
            </Typography>
          )
        ) : (
          <>
            {owned.length > 0 && (
              <>
                <GroupBand>{t('Your assets')}</GroupBand>
                {list(owned)}
              </>
            )}
            {others.length > 0 && (
              <>
                <GroupBand>{owned.length ? t('Other assets') : t('Assets')}</GroupBand>
                {list(others)}
              </>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
};

export default PickToken;
