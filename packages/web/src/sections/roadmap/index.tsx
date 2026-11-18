import { Reveal } from '@/components/_common/reveal';
import { HatchRail } from '@/components/_common/hatch';

import { RoadmapCta } from './roadmap-cta';
import { RoadmapHero } from './roadmap-hero';
import { RoadmapNext } from './roadmap-next';
import { RoadmapPrinciples } from './roadmap-principles';
import { RoadmapMilestones } from './roadmap-milestones';

// ----------------------------------------------------------------------

/**
 * The roadmap. White, on the hairline grid the site frame draws
 * (layouts/site), like the home page: sections divided by hairlines, one
 * focal point each. Rules: packages/web/DESIGN.md.
 */
export default function RoadmapPage() {
  return (
    <>
      {/* Without JavaScript nothing waits to be revealed. */}
      <noscript>
        <style>{'[data-reveal]{opacity:1!important}'}</style>
      </noscript>

      <RoadmapHero />
      <HatchRail />
      <Reveal>
        <RoadmapPrinciples />
      </Reveal>
      <Reveal>
        <RoadmapMilestones />
      </Reveal>
      <Reveal>
        <RoadmapNext />
      </Reveal>
      <Reveal>
        <RoadmapCta />
      </Reveal>
    </>
  );
}
