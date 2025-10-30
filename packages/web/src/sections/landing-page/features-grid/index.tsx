'use client';

import type { Token } from '@normalfinance/types';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { fPercent, fCurrency } from '@/utils/format-number';

import { Box, Paper, Stack, Container, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import IndexBasketArt from '@/components/ui/index-basket-art';

/* ––––– Types ––––– */

type ImageSrc = { src: string; alt?: string };
type ImageNode = { component: React.ReactNode };
type ImageLike = ImageSrc | ImageNode;

const hasSrc = (img: ImageLike): img is ImageSrc => typeof (img as any)?.src === 'string';

const hasComponent = (img: ImageLike): img is ImageNode => (img as any)?.component !== undefined;

interface CardBase {
  icon?: React.ReactElement;
  tagline: string;
  heading: string;
  image?: ImageLike;
  url?: string;
}

export interface SmallCard extends CardBase {
  tokens?: Token[];
}

interface TallCard extends CardBase {}

interface WideCard extends CardBase {}

export interface FeatureGridProps extends React.ComponentPropsWithoutRef<'section'> {
  tagline?: string;
  heading?: string;
  cardsSmall?: [SmallCard, SmallCard];
  cardTall?: TallCard;
  cardWide?: WideCard;
}

/* ––––– Shared styles ––––– */

const paperSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 3,
};

const cardPadding = { xs: 2.5, md: 4 };

/* ––––– Helper renderers ––––– */

const SmallCardItem: React.FC<SmallCard> = (c) => {
  const router = useRouter();
  const isLink = Boolean(c.url);
  const [hovered, setHovered] = React.useState(false);

  const isIndexesArt = !!c.image && hasSrc(c.image) && c.image.src.includes('basket.svg');

  return (
    <Paper
      variant="outlined"
      sx={{ ...paperSx, cursor: isLink ? 'pointer' : 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} // keyboard focus
      onBlur={() => setHovered(false)}
      onTouchStart={() => setHovered(true)} // mobile
      onTouchEnd={() => setHovered(false)}
      onClick={() => isLink && router.push(c.url!)}
      role={isLink ? 'link' : undefined}
      tabIndex={isLink ? 0 : undefined}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: c.image ? { xs: 'column', md: 'row' } : 'column',
          height: '100%',
        }}
      >
        <Stack spacing={2} p={cardPadding} flexGrow={1} justifyContent="flex-start">
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              px: 2.5,
              py: 1,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              width: 'fit-content',
              alignSelf: { xs: 'flex-start', md: 'flex-start' },
            }}
          >
            {c.icon && (
              <Box
                component="span"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: { xs: 16, md: 18 },
                }}
              >
                {React.cloneElement(c.icon, {
                  width: undefined,
                  height: undefined,
                })}
              </Box>
            )}
            <Typography variant="subtitle2" fontWeight={600}>
              {c.tagline}
            </Typography>
          </Box>

          {/* heading */}
          <Typography
            variant="h4"
            fontWeight={500}
            color="text.primary"
            sx={{
              fontSize: { xs: 20, md: 24 },
              lineHeight: { xs: '30px', md: '36px' },
            }}
          >
            {c.heading}
          </Typography>

          {/* token preview list */}
          {c.tokens && (
            <Stack spacing={1} mt={2}>
              {c.tokens.map((tkn, index) => (
                <Box
                  key={index}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={1}
                  width={1}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tkn.icon) router.push(paths.pools.details(tkn.symbol));
                  }}
                  role={tkn.icon ? 'link' : undefined}
                  tabIndex={tkn.icon ? 0 : undefined}
                  sx={{
                    cursor: tkn.icon ? 'pointer' : 'default',
                    transition: 'transform 0.15s ease',
                    '&:hover': {
                      transform: tkn.icon ? 'scale(1.03)' : 'none',
                    },
                    px: { xs: '12px', md: '16px' },
                    py: { xs: '6px', md: '12px' },
                    bgcolor: 'white',
                    borderRadius: 1.5,
                    border: '1px solid rgba(87, 146, 255, 0.15)',
                  }}
                >
                  {/* left side (icon + symbols) */}
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      component="img"
                      src={tkn.icon}
                      alt={tkn.symbol}
                      sx={{ width: { xs: 24, md: 32 }, height: { xs: 24, md: 32 } }}
                    />
                    <Typography
                      fontWeight={500}
                      sx={{
                        fontSize: { xs: 18, md: 20 },
                        color: 'text.primary',
                      }}
                    >
                      {tkn.name}
                    </Typography>
                    <Typography
                      fontWeight={500}
                      sx={{
                        fontSize: { xs: 18, md: 20 },
                        color: 'text.secondary',
                      }}
                    >
                      {tkn.symbol}
                    </Typography>
                  </Box>

                  {/* right side (price + change) */}
                  <Box
                    display="flex"
                    alignItems="end"
                    gap={1}
                    sx={{ flexDirection: { xs: 'column', md: 'row' } }}
                    justifyContent="flex-end"
                    textAlign="end"
                    rowGap="0px"
                  >
                    <Typography
                      fontWeight={500}
                      sx={{ fontSize: { xs: 14, md: 20 }, color: 'text.primary' }}
                    >
                      {fCurrency(tkn.price.toString())}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        columnGap: 1,
                        rowGap: '2px',
                      }}
                    >
                      <Iconify
                        icon={
                          (tkn.percentageChange ?? 0) < 0
                            ? 'solar:double-alt-arrow-down-bold-duotone'
                            : 'solar:double-alt-arrow-up-bold-duotone'
                        }
                        sx={{
                          width: { xs: 10, md: 16 }, // responsive icon size
                          color: (tkn.percentageChange ?? 0) < 0 ? 'error.main' : 'success.main',
                        }}
                      />

                      <Typography
                        fontWeight={500}
                        sx={{
                          fontSize: { xs: 12, md: 20 },
                          color: (tkn.percentageChange ?? 0) < 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        {fPercent(tkn.percentageChange)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}

          {/* optional image (placed last for mobile flow) */}
          {c.image &&
            (hasSrc(c.image) ? (
              isIndexesArt ? (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  width={{ xs: '100%', md: '100%' }}
                >
                  <Box sx={{ mt: 4, px: { xs: 2, md: 4 } }} width={{ xs: '100%', md: '60%' }}>
                    <IndexBasketArt />
                  </Box>
                </Box>
              ) : (
                <Box
                  component="img"
                  src={c.image.src}
                  alt={c.image.alt}
                  width="50%"
                  height="auto"
                  sx={{ objectFit: 'cover', mt: 4 }}
                />
              )
            ) : hasComponent(c.image) ? (
              <Box sx={{ mt: 4, px: { xs: 2, md: 4 } }} width={{ xs: '100%', md: '60%' }}>
                {c.image.component}
              </Box>
            ) : null)}
        </Stack>
      </Box>
    </Paper>
  );
};
const TallCardItem: React.FC<TallCard> = (c) => {
  const router = useRouter();
  const isLink = Boolean(c.url);

  return (
    <Paper
      variant="outlined"
      sx={{ ...paperSx, cursor: isLink ? 'pointer' : 'default', height: '100%' }}
      onClick={() => isLink && router.push(c.url!)}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack spacing={2} pt={{ xs: 3, md: 4 }} px={{ xs: 3, md: 4 }} justifyContent="start">
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              px: '20px',
              py: '8px',
              borderRadius: '32px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              justifyContent: 'center',
              width: 'fit-content',
            }}
          >
            {c.icon && (
              <Box
                component="span"
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {c.icon}
              </Box>
            )}
            <Typography variant="subtitle2" fontWeight={600}>
              {c.tagline}
            </Typography>
          </Box>
          <Typography
            variant="h4"
            fontWeight={500}
            color="text.primary"
            fontSize={24}
            lineHeight="36px"
          >
            {c.heading}
          </Typography>
        </Stack>
        {c.image &&
          (hasSrc(c.image) ? (
            <Box
              component="img"
              src={c.image.src}
              alt={c.image.alt}
              px={{ xs: 3, md: 4 }}
              pb={{ xs: 3, md: 4 }}
              width="100%"
            />
          ) : hasComponent(c.image) ? (
            <Box px={{ xs: 3, md: 4 }} pb={{ xs: 3, md: 4 }} width="100%">
              {c.image.component}
            </Box>
          ) : null)}
      </Box>
    </Paper>
  );
};

const WideCardItem: React.FC<WideCard> = (c) => {
  const router = useRouter();
  const isLink = Boolean(c.url);

  return (
    <Paper
      variant="outlined"
      sx={{ ...paperSx, cursor: isLink ? 'pointer' : 'default' }}
      onClick={() => isLink && router.push(c.url!)}
    >
      <Stack spacing={2} p={cardPadding} textAlign={{ xs: 'center', md: 'left' }}>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            px: '20px',
            py: '8px',
            borderRadius: '32px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            justifyContent: 'center',
            width: 'fit-content',
          }}
        >
          {c.icon && (
            <Box
              component="span"
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {c.icon}
            </Box>
          )}
          <Typography variant="subtitle2" fontWeight={600}>
            {c.tagline}
          </Typography>
        </Box>
        <Typography
          variant="h4"
          fontWeight={500}
          color="text.primary"
          fontSize={24}
          lineHeight="36px"
          textAlign="left"
        >
          {c.heading}
        </Typography>
      </Stack>
      {c.image &&
        (hasSrc(c.image) ? (
          <Box
            component="img"
            src={c.image.src}
            alt={c.image.alt}
            px={{ xs: 3, md: 4 }}
            pb={{ xs: 3, md: 4 }}
            width="100%"
          />
        ) : hasComponent(c.image) ? (
          <Box
            px={{ xs: 3, md: 4 }}
            sx={{ display: 'flex', alignItems: 'end', justifyContent: 'end' }}
            width="100%"
          >
            {c.image.component}
          </Box>
        ) : null)}
    </Paper>
  );
};

/* ––––– Main component ––––– */

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  tagline = 'Why Normal?',
  heading = 'Powerful features for every trader',
  cardsSmall,
  cardTall,
  cardWide,
  ...sectionProps
}) => {
  const { t } = useTranslate();

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: '5%',
        py: { xs: 6, md: 8, lg: 10 },
        backgroundColor: 'white',
      }}
      {...sectionProps}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, px: 0 }}>
        <Stack spacing={2} maxWidth={640} textAlign="left" mb={{ xs: 3, md: 4 }}>
          <Typography variant="h2" fontWeight={500}>
            {t('Crypto made normal')}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 2 },
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          }}
        >
          {/* small card #1 (token preview) */}
          {cardsSmall && <SmallCardItem {...cardsSmall[0]} />}

          {/* tall card spans 2 rows on lg */}
          {cardTall && (
            <Box sx={{ gridRow: { lg: 'span 2' } }}>
              <TallCardItem {...cardTall} />
            </Box>
          )}

          {/* small card #2 */}
          {cardsSmall && <SmallCardItem {...cardsSmall[1]} />}

          {/* wide card spans both columns on lg */}
          {cardWide && (
            <Box sx={{ gridColumn: { lg: '1 / span 2' } }}>
              <WideCardItem {...cardWide} />
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};
