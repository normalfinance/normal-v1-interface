import { CtaCommunity } from '@/components/_roadmap-page/cta-community';
import { MissionSection } from '@/components/_roadmap-page/mission';
import { Roadmap } from '@/components/_roadmap-page/roadmap';

export default function RoadmapPage() {
  return (
    <>
      <MissionSection />
      <Roadmap />
      <CtaCommunity />
    </>
  );
}
