import React, { useState } from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
} from '@mui/lab';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
} from '@mui/material';
import { IndexEvent } from '@normalfinance/types';
import { alpha, useTheme } from '@mui/material/styles';

// Color mapping for different event types
const eventDotColor: Record<IndexEvent['type'], 'primary' | 'success' | 'error' | 'warning'> = {
  CREATION: 'primary',
  ADD: 'success',
  REMOVE: 'error',
  REBALANCE: 'warning',
};

export function IndexHistoryTimeline({ events }: { events: IndexEvent[] }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  // Sort events by timestamp descending (most recent first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // show up to 5 most recent events by default
  const recentEvents = sortedEvents.slice(0, 5);

  // Handlers for dialog open/close
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <Card
      sx={[
        {
          p: 4,
          borderRadius: 3,
          alignItems: 'center',
          border: 1,
          borderColor: alpha(theme.palette.grey[500], 0.32),
        },
      ]}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Timeline showing recent events */}
        <Timeline
          position="right"
          sx={{ '& .MuiTimelineItem-missingOppositeContent:before': { display: 'none' } }}
        >
          {recentEvents.map((event, idx) => {
            // Determine the label text based on event type
            let label: string;
            switch (event.type) {
              case 'CREATION':
                label = `Index created: ${event.assetName}`;
                break;
              case 'ADD':
                label = `Added ${event.assetShortname}`;
                break;
              case 'REMOVE':
                label = `Removed ${event.assetShortname}`;
                break;
              case 'REBALANCE':
                label = `Rebalanced ${event.assetShortname} to ${event.percent}%`;
                break;
            }
            return (
              <TimelineItem key={idx}>
                <TimelineSeparator>
                  <TimelineDot color={eventDotColor[event.type]} />
                  {/** Only render connector if not the last item in this list */}
                  {idx < recentEvents.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="body2" color="text.primary">
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(event.timestamp).toLocaleString()}
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>

        {/* "View All" button to show the full timeline if more events exist */}
        {events.length > 5 && (
          <Box textAlign="left" sx={{ mt: 1 }}>
            <Button size="small" onClick={handleOpen}>
              View All
            </Button>
          </Box>
        )}

        {/* Dialog showing all events in a scrollable timeline */}
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          scroll="paper"
          aria-labelledby="timeline-dialog-title"
        >
          <DialogTitle id="timeline-dialog-title">Index Event History</DialogTitle>
          <DialogContent dividers={true} sx={{ maxHeight: '80vh' }}>
            <Timeline
              position="right"
              sx={{ '& .MuiTimelineItem-missingOppositeContent:before': { display: 'none' } }}
            >
              {sortedEvents.map((event, idx) => {
                // Reuse the same label logic for each event
                let label: string;
                switch (event.type) {
                  case 'CREATION':
                    label = `Index created: ${event.assetName}`;
                    break;
                  case 'ADD':
                    label = `Added ${event.assetShortname}`;
                    break;
                  case 'REMOVE':
                    label = `Removed ${event.assetShortname}`;
                    break;
                  case 'REBALANCE':
                    label = `Rebalanced ${event.assetShortname} to ${event.percent}%`;
                    break;
                }
                return (
                  <TimelineItem key={idx}>
                    <TimelineSeparator>
                      <TimelineDot color={eventDotColor[event.type]} />
                      {idx < sortedEvents.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="body2" color="text.primary">
                        {label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.timestamp).toLocaleString()}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Card>
  );
}
