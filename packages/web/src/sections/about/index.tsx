import React from 'react';

import Moments from '@/components/moments';
import Team from '@/components/_about-us-page-components/team';
import CoreValues from '@/components/_about-us-page-components/core-values';
import AboutHeader from '@/components/_about-us-page-components/about-header';

const AboutUsView: React.FC = () => (
  <>
    <AboutHeader />
    <Moments />
    <CoreValues />
    <Team />
  </>
);

export default AboutUsView;
