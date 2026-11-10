import { Reveal } from '@/components/_common/reveal';
import { HatchRail } from '@/components/_common/hatch';

import { HomeCta } from './home-cta';
import { HomeHero } from './home-hero';
import { HomeIntro } from './home-intro';
import { HomeSteps } from './home-steps';
import { FaqAccordion } from './home-faq';
import { HomeSavings } from './home-savings';
import { HomeProducts } from './home-products';
import { HomeSecurity } from './home-security';
import { HomeTestimonials } from './home-testimonials';

// ----------------------------------------------------------------------

/**
 * The marketing home page. White, set on the hairline grid the site frame
 * draws (layouts/site): sections divided by hairlines, content touching the
 * frame lines. Colour comes from photos, the real app, pale tints and one
 * statement. Rules: packages/web/DESIGN.md.
 */
export default function HomeView() {
  return (
    <>
      {/* Without JavaScript nothing waits to be revealed. */}
      <noscript>
        <style>{'[data-reveal]{opacity:1!important}'}</style>
      </noscript>

      <HomeHero />
      <HomeIntro />
      <HatchRail />
      <Reveal>
        <HomeProducts />
      </Reveal>
      <Reveal>
        <HomeSavings />
      </Reveal>
      <Reveal>
        <HomeSteps />
      </Reveal>
      <Reveal>
        <HomeSecurity />
      </Reveal>
      <Reveal>
        <HomeTestimonials />
      </Reveal>
      <Reveal>
        <FaqAccordion />
      </Reveal>
      <HatchRail />
      <Reveal>
        <HomeCta />
      </Reveal>
    </>
  );
}
