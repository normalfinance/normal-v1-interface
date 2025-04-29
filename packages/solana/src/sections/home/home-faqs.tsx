import type { BoxProps } from '@mui/material/Box';

import { useState } from 'react';
import { m } from 'framer-motion';
import { paths } from '@/routes/paths';
import { varAlpha } from 'minimal-shared/utils';
import { RouterLink } from '@/routes/components';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Accordion, { accordionClasses } from '@mui/material/Accordion';
import AccordionDetails, { accordionDetailsClasses } from '@mui/material/AccordionDetails';
import AccordionSummary, { accordionSummaryClasses } from '@mui/material/AccordionSummary';

import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';

import { SectionTitle } from './components/section-title';
import { FloatLine, FloatPlusIcon, FloatTriangleDownIcon } from './components/svg-elements';

// ----------------------------------------------------------------------

const FAQs = [
  {
    question: 'What is Normal?',
    answer: (
      <Typography>
        Normal is a crypto investing platform focused on making it possible to trade any and all
        crypto assets in a fully on-chain way without the need for bridges or CEXes.
      </Typography>
    ),
  },
  {
    question: 'How does Normal work?',
    answer: <Typography>Normal creates</Typography>,
  },
  {
    question: 'When can I use Normal?',
    answer: (
      <Typography>
        Normal will be launching in mid 2025 on Solana and Stellar - with tokens available on your
        favorite DEXes like Jupiter, Orca, Raydium, and more.
      </Typography>
    ),
  },
  {
    question: 'Which assets are supported on Normal?',
    answer: (
      <Typography>
        Bitcoin, Ethereum, Solana, XRP, and Dogecoin will be the first five Normal tokens launched.
        Every week, Normal will launch markets for each of the Top 100 crypto assets in order of
        average weekly volume.
      </Typography>
    ),
  },
  {
    question: 'What are crypto indexes and how do they work?',
    answer: (
      <Typography>
        Bitcoin, Ethereum, Solana, XRP, and Dogecoin will be the first five Normal tokens launched.
        Every week, Normal will launch markets for each of the Top 100 crypto assets in order of
        average weekly volume.
      </Typography>
    ),
  },
  {
    question: 'How can I get involved?',
    answer: (
      <Typography>
        The best way to connect with our team and become a Normie is by joining our{' '}
        <Link href={paths.socials.discord} target="_blank" rel="noopener" sx={{ mx: 0.5 }}>
          Discord
        </Link>{' '}
        and following on{' '}
        <Link href={paths.socials.twitter} target="_blank" rel="noopener" sx={{ mx: 0.5 }}>
          X
        </Link>
        . If you&apos;re a developer and would like contribute, please
      </Typography>
    ),
  },
];

// ----------------------------------------------------------------------

export function HomeFAQs({ sx, ...other }: BoxProps) {
  const [expanded, setExpanded] = useState<string | false>(FAQs[0].question);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const renderDescription = () => (
    <SectionTitle
      caption="FAQs"
      title="We’ve got the"
      txtGradient="answers"
      sx={{ textAlign: 'center' }}
    />
  );

  const renderContent = () => (
    <Stack
      spacing={1}
      sx={[
        () => ({
          mt: 8,
          mx: 'auto',
          maxWidth: 720,
          mb: { xs: 5, md: 8 },
        }),
      ]}
    >
      {FAQs.map((item, index) => (
        <Accordion
          key={item.question}
          component={m.div}
          variants={varFade('inUp', { distance: 24 })}
          expanded={expanded === item.question}
          onChange={handleChange(item.question)}
          sx={(theme) => ({
            borderRadius: 2,
            transition: theme.transitions.create(['background-color'], {
              duration: theme.transitions.duration.short,
            }),
            '&::before': { display: 'none' },
            '&:hover': { bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16) },
            '&:first-of-type, &:last-of-type': { borderRadius: 2 },
            [`&.${accordionClasses.expanded}`]: {
              m: 0,
              borderRadius: 2,
              boxShadow: 'none',
              bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
            },
            [`& .${accordionSummaryClasses.root}`]: {
              py: 3,
              px: 2.5,
              minHeight: 'auto',
              [`& .${accordionSummaryClasses.content}`]: {
                m: 0,
                [`&.${accordionSummaryClasses.expanded}`]: { m: 0 },
              },
            },
            [`& .${accordionDetailsClasses.root}`]: { px: 2.5, pt: 0, pb: 3 },
          })}
        >
          <AccordionSummary
            expandIcon={
              <Iconify
                width={20}
                icon={expanded === item.question ? 'mingcute:minimize-line' : 'mingcute:add-line'}
              />
            }
            aria-controls={`panel${index}bh-content`}
            id={`panel${index}bh-header`}
          >
            <Typography variant="h6"> {item.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>{item.answer}</AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );

  const renderContact = () => (
    <Box
      sx={[
        (theme) => ({
          px: 3,
          py: 8,
          textAlign: 'center',
          background: `linear-gradient(to left, ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}, transparent)`,
        }),
      ]}
    >
      <m.div variants={varFade('in')}>
        <Typography variant="h4">Still have questions?</Typography>
      </m.div>

      <m.div variants={varFade('in')}>
        <Typography sx={{ mt: 2, mb: 3, color: 'text.secondary' }}>
          Our team and community are happy to help
        </Typography>
      </m.div>

      <m.div variants={varFade('in')}>
        <Button
          variant="contained"
          LinkComponent={RouterLink}
          href={paths.socials.twitter}
          startIcon={<Iconify icon="ic:baseline-x" />}
          sx={{ backgroundColor: '#000000', mr: 2 }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow us on X
        </Button>
        <Button
          variant="contained"
          LinkComponent={RouterLink}
          href={paths.socials.discord}
          startIcon={<Iconify icon="ic:baseline-discord" />}
          sx={{ backgroundColor: '#5865F2' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Join our Discord
        </Button>
      </m.div>
    </Box>
  );

  return (
    <Box component="section" sx={sx} {...other}>
      <MotionViewport sx={{ py: 10, position: 'relative' }}>
        {topLines()}

        <Container>
          {renderDescription()}
          {renderContent()}
        </Container>

        <Stack sx={{ position: 'relative' }}>
          {bottomLines()}
          {renderContact()}
        </Stack>
      </MotionViewport>
    </Box>
  );
}

// ----------------------------------------------------------------------

const topLines = () => (
  <>
    <Stack
      spacing={8}
      alignItems="center"
      sx={{
        top: 64,
        left: 80,
        position: 'absolute',
        transform: 'translateX(-50%)',
      }}
    >
      <FloatTriangleDownIcon sx={{ position: 'static', opacity: 0.12 }} />
      <FloatTriangleDownIcon
        sx={{
          width: 30,
          height: 15,
          opacity: 0.24,
          position: 'static',
        }}
      />
    </Stack>

    <FloatLine vertical sx={{ top: 0, left: 80 }} />
  </>
);

const bottomLines = () => (
  <>
    <FloatLine sx={{ top: 0, left: 0 }} />
    <FloatLine sx={{ bottom: 0, left: 0 }} />
    <FloatPlusIcon sx={{ top: -8, left: 72 }} />
    <FloatPlusIcon sx={{ bottom: -8, left: 72 }} />
  </>
);
