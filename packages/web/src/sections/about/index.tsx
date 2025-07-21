import AboutHeader from '@/components/_about-us-page-components/about-header';
import CoreValues from '@/components/_about-us-page-components/core-values';
import Vision from '@/components/_about-us-page-components/vision';
import React from 'react';
import { TestimonialGrid } from '../landing-page/testimonials/testimonials';
import { StatsGrid } from '../landing-page/stats-grid/stats-grid';
import Moments from '@/components/moments';
import Team from '@/components/_about-us-page-components/team';

const AboutUsView: React.FC = () => {
  return (
    <>
      <AboutHeader />
      <CoreValues />
      <Vision />
      <Moments />
      <TestimonialGrid />
      <StatsGrid />
      <Team />
    </>
  );
};

export default AboutUsView;
