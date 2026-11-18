'use client';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';

import { BrandButton } from '@/components/_common/brand';
import { PageHero } from '@/components/_common/page-hero';

// ----------------------------------------------------------------------

// The waiting list form. Not in routes/paths.ts yet.
const WAITING_LIST_URL = 'https://forms.fillout.com/t/tidFgHnmWWus';

/**
 * Where a visitor from a restricted region lands (the middleware's geo-block,
 * parked for now): what happened, why, and what they can do. The Terms link
 * goes to the site's own copy, which a blocked visitor can still open: the
 * block only covers /app and /api.
 */
export default function BlockedView() {
  const { t } = useTranslate();

  return (
    <PageHero
      compact
      id="blocked-title"
      eyebrow={t('Not available here')}
      title={t("Sorry, we can't serve your region.")}
      lede={t(
        'Normal is not available in your region. Based on your location being a current Restricted Jurisdiction, you are prohibited from accessing or using the Normal app, platform or smart contracts due to local laws and regulations, as per our Terms of Service.'
      )}
      actions={
        <>
          <BrandButton href={WAITING_LIST_URL} target="_blank" rel="noopener noreferrer">
            {t('Join the waiting list')}
          </BrandButton>
          <BrandButton emphasis="secondary" href={paths.legal.tos}>
            {t("View Normal's Terms of Service")}
          </BrandButton>
        </>
      }
    />
  );
}
