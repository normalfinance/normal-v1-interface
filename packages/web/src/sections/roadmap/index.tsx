import { Roadmap } from '@/components/_roadmap-page/roadmap';
import { MissionSection } from '@/components/_roadmap-page/mission';
import { RoadmapHero } from '@/components/_roadmap-page/roadmap-hero';
import { RoadmapBento } from '@/components/_roadmap-page/roadmap-bento';
import { CtaCommunity } from '@/components/_roadmap-page/cta-community';

export default function RoadmapPage() {
  return (
    <>
      <RoadmapHero />
      <MissionSection />
      <Roadmap />
      <RoadmapBento />
      <CtaCommunity />
    </>
  );
}
