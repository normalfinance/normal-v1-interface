import { Reveal } from '@/components/_common/reveal';
import { HatchRail } from '@/components/_common/hatch';

import { HomeCta } from '../home/home-cta';
import { ContactHero } from './contact-hero';
import { FaqAccordion } from '../home/home-faq';
import { ContactChannels } from './contact-channels';

// ----------------------------------------------------------------------

/**
 * Contact: white, on the hairline grid like the home page. The hero's email
 * card is the one wash at the top; the channels, the questions and the
 * closing ask follow, each fading in as it arrives (DESIGN.md).
 */
export default function ContactView() {
  return (
    <>
      {/* Without JavaScript nothing waits to be revealed. */}
      <noscript>
        <style>{'[data-reveal]{opacity:1!important}'}</style>
      </noscript>

      <ContactHero />
      <HatchRail />
      <Reveal>
        <ContactChannels />
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
