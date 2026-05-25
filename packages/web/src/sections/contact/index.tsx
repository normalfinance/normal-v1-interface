import React from 'react';

import { ContactHero } from './contact-hero';
import { ContactChannels } from './contact-channels';
import { FaqAccordion } from '../landing-page/faq';
import { CtaImage } from '../landing-page/cta';

const ContactView: React.FC = () => (
  <>
    <ContactHero />
    <ContactChannels />
    <FaqAccordion />
    <CtaImage />
  </>
);

export default ContactView;
