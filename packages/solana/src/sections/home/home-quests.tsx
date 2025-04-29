import type { BoxProps } from '@mui/material/Box';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { Iconify } from '@/components/iconify';
import { varAlpha } from 'minimal-shared/utils';
import { Scrollbar } from '@/components/scrollbar';
import { MotionViewport } from '@/components/animate';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Card, Button, CardHeader } from '@mui/material';

import { SectionTitle } from './components/section-title';
import { RouterLink } from '@/routes/components';

// ----------------------------------------------------------------------

const QUESTS = [
  {
    id: '0',
    title: 'Follow @normalfi on X',
    description: 'Stay up to date with our upcoming launch',
    reward: '1.10x airdrop boost',
    action: paths.socials.twitter,
  },
  {
    id: '1',
    title: 'Join our Discord',
    description: 'Connect with our team and community',
    reward: '1.15x airdrop boost',
    action: paths.socials.discord,
  },
  {
    id: '2',
    title: 'Share Normal on Twitter',
    description: 'Build hype with our pre-written Tweet',
    reward: '1.25 airdrop boost',
    action:
      'https://twitter.com/intent/tweet?text=Shoutout%20to%20%40normalfi%20for%20an%20epic%20BBQ%20%26%20chill%20party%20after%20%23ETHDenver%21%20They%27re%20launching%20tokenized%20perps%20that%20let%20you%20trade%20any%20crypto%20directly%20on-chain%20without%20bridges%20or%20CEXs%20%F0%9F%94%A5%20%0A%0AGrab%20their%20token%20whitelist%20while%20you%20can%3A%20https%3A%2F%2Falpha.normalfinance.io%2F',
  },
  {
    id: '3',
    title: 'Commit to provide liquidity on Normal v1',
    description: 'Earn 7%+ yield on your SOL when we launch',
    reward: '1.10x airdrop boost',
    action: 'https://forms.fillout.com/t/eDb8Azmobbus?email=xxxxx',
  },
  {
    id: '4',
    title: '',
    description: '',
    reward: '1.10x airdrop boost',
    action: '',
  },
];

// ----------------------------------------------------------------------

export function HomeQuests({ sx, ...other }: BoxProps) {
  const [selected, setSelected] = useState(['2']);

  const handleClickComplete = (taskId: string) => {
    const tasksCompleted = selected.includes(taskId)
      ? selected.filter((value) => value !== taskId)
      : [...selected, taskId];

    setSelected(tasksCompleted);
  };

  return (
    <Box component="section" sx={sx} {...other}>
      <MotionViewport sx={{ py: 10, position: 'relative' }}>
        <Container>
          <SectionTitle
            title="Join the action"
            txtGradient="now!"
            sx={{ mb: { xs: 5, md: 8 }, textAlign: 'center' }}
          />

          <Card sx={sx}>
            <CardHeader title="Quests" subheader="Complete quests to earn rewards" sx={{ mb: 1 }} />

            <Scrollbar sx={{ minHeight: 304 }}>
              <Box
                sx={{
                  p: 3,
                  gap: 3,
                  minWidth: 360,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {QUESTS.map((item) => (
                  <TaskItem
                    key={item.id}
                    item={item}
                    selected={selected.includes(item.id)}
                    onChange={() => handleClickComplete(item.id)}
                  />
                ))}
              </Box>
            </Scrollbar>
          </Card>
        </Container>
      </MotionViewport>
    </Box>
  );
}

// ----------------------------------------------------------------------

type TaskItemProps = BoxProps & {
  selected: boolean;
  item: any; // Props['list'][number];
  onChange: (id: string) => void;
};

function TaskItem({ item, selected, onChange, sx, ...other }: TaskItemProps) {
  return (
    <Box
      sx={[{ gap: 2, display: 'flex', alignItems: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <Box
        sx={[
          (theme) => ({
            width: 40,
            height: 40,
            display: 'flex',
            borderRadius: '50%',
            alignItems: 'center',
            color: 'primary.main',
            justifyContent: 'center',
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
            ...(item.id === '1' && {
              color: 'secondary.main',
              bgcolor: varAlpha(theme.vars.palette.secondary.mainChannel, 0.08),
            }),
            ...(item.id === '2' && {
              color: 'error.main',
              bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.08),
            }),
            ...(item.id === '3' && {
              color: 'warning.main',
              bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.08),
            }),
            ...(item.id === '4' && {
              color: 'info.main',
              bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.08),
            }),
            ...(item.id === '5' && {
              color: 'success.main',
              bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.08),
            }),
          }),
        ]}
      >
        <Iconify width={24} icon="solar:cup-star-bold" />
      </Box>

      <Box flexGrow={1}>
        <Box sx={{ typography: 'subtitle2' }}>{item.title}</Box>

        <Box
          sx={{
            gap: 0.5,
            mt: 0.5,
            alignItems: 'center',
            typography: 'caption',
            display: 'inline-flex',
            color: 'text.secondary',
          }}
        >
          <Iconify icon="mingcute:information-fill" width={14} />
          {item.description}

          <Iconify icon="mingcute:receive-money-fill" width={14} />
          {item.reward}
        </Box>
      </Box>

      <Button
        variant="contained"
        color="info"
        size="small"
        LinkComponent={RouterLink}
        href={item.action}
        target="_blank"
        rel="noopener noreferrer"
      >
        Complete
      </Button>
    </Box>
  );
}
