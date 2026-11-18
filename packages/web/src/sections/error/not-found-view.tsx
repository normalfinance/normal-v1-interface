'use client';

import type { LinkCell } from '@/sections/contact/link-cells';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { LinkCells } from '@/sections/contact/link-cells';

import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';

import { PageHero } from '@/components/_common/page-hero';
import { Eyebrow, BrandButton, PageSection } from '@/components/_common/brand';

// ----------------------------------------------------------------------

/**
 * The 404, inside the site frame (app/not-found.tsx): what happened in plain
 * words, the way home, and a calm row of places worth going instead.
 */
export function NotFoundView() {
  const { t } = useTranslate();

  // The descriptions are the header menu's own.
  const places: LinkCell[] = [
    {
      icon: <SavingsOutlined />,
      name: t('Savings'),
      detail: t('Earn on your digital dollars.'),
      href: paths.site.savings,
    },
    {
      icon: <VerifiedUserOutlined />,
      name: t('Security'),
      detail: t('Your money stays in your own wallet.'),
      href: paths.site.security,
    },
    {
      icon: <ArticleOutlined />,
      name: t('Docs'),
      detail: t('How Normal works.'),
      href: paths.docs,
      external: true,
    },
    {
      icon: <HelpOutlineOutlined />,
      name: t('Help'),
      detail: t('Ask us on Discord.'),
      href: paths.help.feedbackForm,
      external: true,
    },
  ];

  return (
    <>
      <PageHero
        compact
        id="not-found-title"
        eyebrow={t('Error 404')}
        title={t("We can't find that page.")}
        lede={t(
          'It may have moved, or the address may have a typo. Check the spelling, or start again from the home page.'
        )}
        actions={
          <>
            <BrandButton href={paths.root}>{t('Go to home')}</BrandButton>
            <BrandButton emphasis="secondary" href={paths.core.contact}>
              {t('Contact us')}
            </BrandButton>
          </>
        }
      />
      <PageSection divider hatchFoot aria-label={t('Other pages')}>
        <Eyebrow sx={{ mb: 3 }}>{t('Or try one of these')}</Eyebrow>
        <LinkCells items={places} />
      </PageSection>
    </>
  );
}
