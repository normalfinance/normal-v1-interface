import { MissionSection } from '@/components/_roadmap-page/mission';
import { Roadmap } from '@/components/_roadmap-page/roadmap';
import { Box } from '@mui/material';

export default function RoadmapPage() {
  return (
    <>
      <MissionSection />
      <Roadmap />
      <Box sx={{ height: '50vh', backgroundColor: 'red' }}></Box>
    </>
  );
}
