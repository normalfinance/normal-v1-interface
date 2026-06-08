import React from 'react';

import { ContactHero } from './contact-hero';
import { CtaImage } from '../landing-page/cta';
import { FaqAccordion } from '../landing-page/faq';
import { ContactChannels } from './contact-channels';

const ContactView: React.FC = () => (
  <>
    <ContactHero />
    <ContactChannels />
    <FaqAccordion />
    <CtaImage />
  </>
);

export default ContactView;
