import React from 'react';

import Moments from '@/components/moments';
import Team from '@/components/_about-us-page-components/team';
import Vision from '@/components/_about-us-page-components/vision';
import CoreValues from '@/components/_about-us-page-components/core-values';
import AboutHeader from '@/components/_about-us-page-components/about-header';

import { StatsGrid } from '../landing-page/stats-grid/stats-grid';
import { TestimonialGrid } from '../landing-page/testimonials/testimonials';

const AboutUsView: React.FC = () => (
  <>
    <AboutHeader />
    <Vision />
    <Moments />
    <CoreValues />
    <TestimonialGrid />
    <StatsGrid />
    <Team />
  </>
);

export default AboutUsView;
