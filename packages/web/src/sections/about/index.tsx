import { HomeCta } from '@/sections/home/home-cta';

import { Reveal } from '@/components/_common/reveal';
import { HatchRail } from '@/components/_common/hatch';

import { AboutHero } from './about-hero';
import { AboutTeam } from './about-team';
import { AboutValues } from './about-values';
import { AboutFounder } from './about-founder';
import { AboutMoments } from './about-moments';
import { AboutPartners } from './about-partners';

// ----------------------------------------------------------------------

/**
 * The About page, in the home page's style: white, on the hairline grid the
 * site frame draws (layouts/site), sections divided by hairlines, at most one
 * wash in each. Rules: packages/web/DESIGN.md.
 */
export default function AboutUsView() {
  return (
    <>
      {/* Without JavaScript nothing waits to be revealed. */}
      <noscript>
        <style>{'[data-reveal]{opacity:1!important}'}</style>
      </noscript>

      <AboutHero />
      <AboutPartners />
      <HatchRail />
      <Reveal>
        <AboutValues />
      </Reveal>
      <Reveal>
        <AboutFounder />
      </Reveal>
      <Reveal>
        <AboutTeam />
      </Reveal>
      <Reveal>
        <AboutMoments />
      </Reveal>
      <Reveal>
        <HomeCta />
      </Reveal>
    </>
  );
}
