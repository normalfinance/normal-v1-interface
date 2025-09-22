import { Roadmap } from '@/components/_roadmap-page/roadmap';
import { MissionSection } from '@/components/_roadmap-page/mission';
import { CtaCommunity } from '@/components/_roadmap-page/cta-community';

export default function RoadmapPage() {
  return (
    <>
      <MissionSection />
      <Roadmap />
      <CtaCommunity />
    </>
  );
}
