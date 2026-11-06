import type { Theme, SxProps } from '@mui/material/styles';

import { MUTED, CANVAS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';

// ----------------------------------------------------------------------

// Every photo on the marketing site, in one place.
//
// TEMPORARY: the `src` values are free Pexels photos (pexels.com/license: free
// for commercial use, no attribution needed) so the pages can be judged with
// real people in them. They are replaced by the licensed Envato set, uploaded
// to the CDN under marketing/ (set `src` to cdn('marketing/<slot>.webp')). A
// slot without a `src` shows its brief instead, so the layout never breaks.

export type PhotoSlot = 'hero' | 'savings' | 'everyday' | 'signup' | 'addMoney' | 'enjoy' | 'about';

type PhotoSpec = {
  alt: string;
  /** What the final photo shows: the brief for choosing it. */
  brief: string;
  /** Export size for the final photo. */
  size: string;
  src: string | null;
  /** Smaller versions for small screens, as an img srcSet. */
  srcSet?: string;
  /** Which part of the photo stays in frame when it is cropped. */
  focus?: string;
  /** The top of a page: loads at once, not when scrolled to. */
  eager?: boolean;
};

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;

export const MARKETING_PHOTOS: Record<PhotoSlot, PhotoSpec> = {
  hero: {
    alt: 'A hand holding a phone with the Normal app open on its Home screen',
    brief:
      'A hand holding a phone, its blank screen to the camera, with wide out-of-focus room on the left for the headline. Runs the full width of the screen. The real Home screen is drawn onto the phone by HeroPhone.',
    size: '3456 × 1440',
    // Pexels photo 30641362, widened to 2.4:1: its blurred background is
    // stretched out to the left. The phone's screen is blank in the file;
    // sections/home/hero-phone.tsx lays the live Home screen over it, and
    // sets the crop for each screen width.
    src: '/marketing/hero-wide.jpg',
    srcSet:
      '/marketing/hero-wide-1200.jpg 1200w, /marketing/hero-wide-1728.jpg 1728w, /marketing/hero-wide.jpg 3456w',
    eager: true,
  },
  savings: {
    alt: 'A woman relaxing on her sofa at home, checking her phone',
    brief: 'Someone relaxed on the sofa at home, checking their phone. Calm, unhurried.',
    size: '2400 × 1200',
    src: pexels(27176011),
    focus: '60% 40%',
  },
  everyday: {
    alt: 'A woman smiling at her phone',
    brief: 'An everyday person, any age, smiling at their phone. Warm, honest, not posed.',
    size: '1600 × 2000',
    src: pexels(7984828),
    focus: '50% 25%',
  },
  signup: {
    alt: 'A young woman signing up on her phone',
    brief: 'Someone calm at home, phone in hand, in soft light: the sign-up moment.',
    size: '1600 × 2000',
    src: pexels(36812954),
    focus: '50% 30%',
  },
  addMoney: {
    alt: 'A woman smiling at her phone with her bank card in the other hand',
    brief: 'Someone holding a bank card and a phone, pleased: adding money for the first time.',
    size: '1600 × 2000',
    src: pexels(6214139),
    focus: '50% 30%',
  },
  enjoy: {
    alt: 'A woman outdoors, relaxed, her phone in her hand',
    brief: 'Someone outdoors with their phone, at ease: money sorted, life going on.',
    size: '1600 × 2000',
    src: pexels(3775085),
    focus: '45% 30%',
  },
  about: {
    alt: 'A big group photo in front of the Meridian 2026 Lisbon backdrop',
    brief:
      'A group photo with the team in it, everyone in frame. Runs the full width of the screen at the top of About.',
    size: '2048 × 1536',
    // The team's own photo, not stock, at Meridian 2026 in Lisbon: 2048 wide
    // as sent, at two widths (public/about). Wide screens show a band of it;
    // the focus keeps the backdrop's name and the whole group, and loses the
    // stone wall above them.
    src: '/about/meridian-group.jpg',
    srcSet: '/about/meridian-group-1200.jpg 1200w, /about/meridian-group.jpg 2048w',
    focus: '50% 68%',
    eager: true,
  },
};

/** A photo slot: the photo once it has one, and its brief until then. */
export function MarketingPhoto({ slot, sx }: { slot: PhotoSlot; sx?: SxProps<Theme> }) {
  const photo = MARKETING_PHOTOS[slot];
  const sxList = Array.isArray(sx) ? sx : [sx];

  const frame = {
    display: 'block',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 'var(--radius-site)',
  } as const;

  if (photo.src) {
    return (
      <Box
        component="img"
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={photo.srcSet ? '100vw' : undefined}
        alt={photo.alt}
        loading={photo.eager ? 'eager' : 'lazy'}
        decoding="async"
        sx={[{ ...frame, objectFit: 'cover', objectPosition: photo.focus ?? 'center' }, ...sxList]}
      />
    );
  }

  return (
    <Box
      role="img"
      aria-label={photo.alt}
      sx={[
        {
          ...frame,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          p: 3,
          textAlign: 'center',
          bgcolor: CANVAS,
          color: MUTED,
        },
        ...sxList,
      ]}
    >
      <PhotoCameraOutlined sx={{ fontSize: 28 }} />
      <Typography sx={{ maxWidth: 380, fontSize: 14, lineHeight: 1.5, color: 'inherit' }}>
        {photo.brief}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'inherit' }}>Photo · {photo.size}</Typography>
    </Box>
  );
}
