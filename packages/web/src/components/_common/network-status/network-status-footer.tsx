'use client';

import { useState } from 'react';
import { Box, Stack, Typography, Menu, MenuItem, Checkbox, ListItemText } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Iconify } from '@/components/template/iconify';

/* ------------------------------------------------------------------ */
/*  Dummy local data / state                                          */
/* ------------------------------------------------------------------ */

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

/** Simulated health flag – flip to false to see the red dot */
const HEALTHY = true;

/** RPC endpoints with fake latency */
const RPC_OPTIONS = [
  { id: 'triton-1', label: 'Triton RPC Pool 1', pingMs: 66 },
  { id: 'helius-1', label: 'Helius 1', pingMs: 287 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function NetworkStatusFooter() {
  const theme = useTheme();

  /* which RPC is chosen?  — local state only */
  const [selectedId, setSelectedId] = useState<string>(RPC_OPTIONS[0].id);

  /* ↓ menu anchor                         */
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const selected = RPC_OPTIONS.find((o) => o.id === selectedId)!; // always exists

  return (
    <>
      {/* —————————————————  fixed footer  ————————————————— */}
      <Box
        component="footer"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 32,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          zIndex: theme.zIndex.appBar,
        }}
      >
        {/* left region : health + RPC selector */}
        <Stack direction="row" spacing={1} alignItems="center">
          {/* green / red dot */}
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: HEALTHY ? 'success.main' : 'error.main',
            }}
          />

          <Typography variant="caption" color="text.primary">
            {HEALTHY ? 'Operational' : 'Offline'}
          </Typography>

          <Typography variant="caption" color="text.primary">
            •
          </Typography>

          {/* clickable RPC */}
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            onClick={openMenu}
            sx={{ cursor: 'pointer' }}
          >
            <Iconify icon="carbon:skill-level-basic" width={14} />
            <Typography variant="caption" color="text.primary">
              RPC:&nbsp;
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {selected.label}
              </Box>
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {selected.pingMs}ms
              </Box>
            </Typography>
            <Iconify icon="eva:arrow-ios-downward-fill" width={14} />
          </Stack>
        </Stack>

        {/* right region : version */}
        <Typography variant="caption" color="text.primary">
          {APP_VERSION}
        </Typography>
      </Box>

      {/* —————————————————  RPC menu  ————————————————— */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Typography variant="body2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
          RPC Endpoint
        </Typography>

        {RPC_OPTIONS.map((opt) => {
          const isFast = opt.pingMs < 100;
          const dotColor = isFast ? theme.palette.success.main : theme.palette.error.main;

          return (
            <MenuItem
              key={opt.id}
              onClick={() => {
                setSelectedId(opt.id);
                closeMenu();
              }}
              sx={{ px: 1.5 }}
            >
              <Checkbox checked={opt.id === selected.id} sx={{ mr: 0 }} />

              <Box
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Typography variant="body2">{opt.label}</Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: dotColor,
                    }}
                  />
                  <Typography component="span" variant="caption" color="text.secondary">
                    {opt.pingMs} ms
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
