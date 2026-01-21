import React from 'react';
import { useTranslate } from '@/locales';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Accordion, Typography, AccordionSummary, AccordionDetails } from '@mui/material';

import { Iconify } from '../template/iconify';

// ----------------------------------------------------------------------

export interface InfoAccordionRow {
  title: string;
  value: string;
}

export interface InfoAccordionAlert {
  title: string;
  icon: string;
}

export interface InfoAccordionProps {
  highlights?: string[];
  alerts?: InfoAccordionAlert[];
  rows?: InfoAccordionRow[];
}

// ----------------------------------------------------------------------

const InfoAccordion: React.FC<InfoAccordionProps> = ({
  highlights = [],
  alerts = [],
  rows = [],
}) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Accordion
      defaultExpanded
      disableGutters
      sx={{
        mt: 0,
        backgroundColor: 'transparent !important',
        boxShadow: 'none !important',
        width: '100%',
        padding: '0px !important',
        '::before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={
          <Iconify
            icon="eva:arrow-ios-upward-fill"
            width={14}
            sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
          />
        }
      >
        {highlights.map((highlight, index) => (
          <Typography
            key={index}
            variant="body2"
            sx={{
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '12px',
            }}
          >
            {t(highlight)}
          </Typography>
        ))}
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0, px: 1 }}>
        <Box
          sx={{
            mt: 0,
            px: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {alerts.map((alert, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                borderRadius: '8px',
              }}
            >
              <Iconify icon={alert.icon} width={14} sx={{ color: theme.palette.text.secondary }} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {t(alert.title)}
              </Typography>
            </Box>
          ))}

          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              px: 1,
            }}
          >
            {rows.map((row, index) => (
              <Box
                key={index}
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.secondary,
                      fontSize: '12px',
                    }}
                  >
                    {t(row.title)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                    fontSize: '12px',
                  }}
                >
                  {row.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default InfoAccordion;
