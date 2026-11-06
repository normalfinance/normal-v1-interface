'use client';

import type { SvgIconComponent } from '@mui/icons-material';

import { HOVER, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TelegramIcon from '@mui/icons-material/Telegram';

import type { SocialLink, SocialNetwork } from './about-data';

// ----------------------------------------------------------------------

const NETWORKS: Record<SocialNetwork, { label: string; Icon: SvgIconComponent }> = {
  x: { label: 'X', Icon: XIcon },
  linkedin: { label: 'LinkedIn', Icon: LinkedInIcon },
  telegram: { label: 'Telegram', Icon: TelegramIcon },
  github: { label: 'GitHub', Icon: GitHubIcon },
};

/**
 * A person's profiles as small square buttons. The icons take the colour of
 * the words around them (ink on the page, the deep shade on a wash): never a
 * brand's own colour (DESIGN.md: icons are never coloured).
 */
export function SocialLinks({
  name,
  links,
  size = 32,
}: {
  /** Whose profiles: each button is named "<name> on <network>". */
  name: string;
  links: SocialLink[];
  size?: 32 | 40;
}) {
  return (
    <Box component="ul" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {links.map((link) => {
        const { label, Icon } = NETWORKS[link.network];
        return (
          <Box component="li" key={link.href} sx={{ display: 'flex' }}>
            <Box
              component="a"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} on ${label}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                color: 'inherit',
                border: `1px solid ${HAIRLINE_STRONG}`,
                borderRadius: 'var(--radius-site)',
                transition: 'background-color 150ms ease',
                '&:hover': { bgcolor: HOVER },
                '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
                '& svg': { fontSize: size === 40 ? 20 : 17 },
              }}
            >
              <Icon />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
