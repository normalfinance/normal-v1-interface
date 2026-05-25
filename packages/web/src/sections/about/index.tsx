import React from 'react';

import Moments from '@/components/moments';
import Team from '@/components/_about-us-page-components/team';
import Vision from '@/components/_about-us-page-components/vision';
import CoreValues from '@/components/_about-us-page-components/core-values';
import AboutHeader from '@/components/_about-us-page-components/about-header';
import { CtaImage } from '@/sections/landing-page/cta';

const AboutUsView: React.FC = () => (
  <>
    <AboutHeader />
    <CoreValues />
    
    <Team />
    <Vision />
    <Moments />
    <CtaImage />
  </>
);

export default AboutUsView;
