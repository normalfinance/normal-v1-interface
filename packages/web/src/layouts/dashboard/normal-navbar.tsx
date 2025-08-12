'use client';

import { useState, useCallback, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Popover,
  Grid,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

type ImageProps = {
  url?: string;
  src: string;
  alt?: string;
};

type MegaMenuLink = {
  url: string;
  image: ImageProps;
  title: string;
  description: string;
  button?: { title: string; variant?: string; size?: string; iconRight?: React.ReactNode };
};

type CategoryLink = {
  title: string;
  links: MegaMenuLink[];
};

type MegaMenuLinkProps = {
  categoryLinks: CategoryLink[];
  featuredSections: {
    title: string;
    links: MegaMenuLink[];
  };
  button: { title: string; variant?: string; size?: string; iconRight?: React.ReactNode };
};

type LinkProps = {
  title: string;
  url: string;
  megaMenu?: MegaMenuLinkProps;
};

export type Props = {
  logo: ImageProps;
  links: LinkProps[];
  buttons: { title: string; variant?: string; size?: string }[];
};

export function NormalNavbar({ logo, links, buttons }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = () => setMobileOpen((p) => !p);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeMega, setActiveMega] = useState<MegaMenuLinkProps | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const openMega = useCallback((el: HTMLElement, mega?: MegaMenuLinkProps) => {
    if (!mega) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setAnchorEl(el);
    setActiveMega(mega);
  }, []);

  const scheduleCloseMega = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setAnchorEl(null);
      setActiveMega(null);
    }, 120);
  }, []);

  const cancelScheduledClose = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
    >
      <Toolbar sx={{ px: { xs: 2, lg: '5%' } }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <a href={logo.url ?? '#'}>
            <img src={logo.src} alt={logo.alt} style={{ height: 28 }} />
          </a>
        </Box>

        {/* Desktop Links */}
        {!isMobile && (
          <Box sx={{ display: 'flex', ml: 4 }}>
            {links.map((link, i) => {
              const hasMega = !!link.megaMenu;
              return (
                <Box
                  key={i}
                  onMouseEnter={(e) => hasMega && openMega(e.currentTarget, link.megaMenu)}
                  onMouseLeave={() => hasMega && scheduleCloseMega()}
                >
                  <Button
                    href={!hasMega ? link.url : undefined}
                    endIcon={hasMega ? <ExpandMoreIcon /> : undefined}
                    onClick={(e) => {
                      if (hasMega) {
                        e.preventDefault();
                        openMega(e.currentTarget, link.megaMenu);
                      }
                    }}
                  >
                    {link.title}
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Desktop Buttons */}
        {!isMobile && (
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            {buttons.map((btn, i) => (
              <Button
                key={i}
                variant={btn.variant === 'secondary' ? 'outlined' : 'contained'}
                size={btn.size === 'sm' ? 'small' : btn.size === 'lg' ? 'large' : 'medium'}
              >
                {btn.title}
              </Button>
            ))}
          </Box>
        )}

        {/* Mobile menu button */}
        {isMobile && (
          <IconButton sx={{ ml: 'auto' }} onClick={toggleMobile}>
            <MenuIcon />
          </IconButton>
        )}
      </Toolbar>

      {/* Mega Menu (Desktop) */}
      <Popover
        open={Boolean(anchorEl) && Boolean(activeMega)}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
          setActiveMega(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          onMouseEnter: cancelScheduledClose,
          onMouseLeave: scheduleCloseMega,
          sx: { mt: 1, px: 3, py: 3, maxWidth: 1100, width: '100%', borderRadius: 2 },
        }}
      >
        {activeMega && (
          <Grid container spacing={4}>
            {/* Categories */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={4}>
                {activeMega.categoryLinks.map((group, gi) => (
                  <Grid item xs={12} md={6} key={gi}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                      {group.title}
                    </Typography>
                    {group.links.map((l, li) => (
                      <Box
                        key={li}
                        component="a"
                        href={l.url}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '24px 1fr',
                          gap: 1.5,
                          alignItems: 'flex-start',
                          py: 1,
                          color: 'inherit',
                          textDecoration: 'none',
                        }}
                      >
                        <img src={l.image.src} alt={l.image.alt} width={24} height={24} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {l.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {l.description}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Featured */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                {activeMega.featuredSections.title}
              </Typography>
              {activeMega.featuredSections.links.map((l, li) => (
                <Box key={li} sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      position: 'relative',
                      pt: '56.25%',
                      mb: 1,
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={l.image.src}
                      alt={l.image.alt}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight={700}>
                    {l.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {l.description}
                  </Typography>
                </Box>
              ))}
              <Button variant="text" size="small" endIcon={activeMega.button.iconRight}>
                {activeMega.button.title}
              </Button>
            </Grid>
          </Grid>
        )}
      </Popover>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={toggleMobile}>
        <Box sx={{ width: 300, p: 2 }}>
          {/* Mobile Nav */}
          <List>
            {links.map((link, i) => {
              const [open, setOpen] = useState(false);
              const hasMega = !!link.megaMenu;
              return (
                <Box key={i}>
                  <ListItemButton
                    onClick={() => (hasMega ? setOpen((p) => !p) : undefined)}
                    component={!hasMega ? 'a' : 'div'}
                    href={!hasMega ? link.url : undefined}
                  >
                    <ListItemText primary={link.title} />
                    {hasMega ? (
                      open ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )
                    ) : (
                      <ArrowRightAltIcon />
                    )}
                  </ListItemButton>
                  {hasMega && (
                    <Collapse in={open}>
                      {link.megaMenu!.categoryLinks.map((group, gi) => (
                        <Box key={gi} sx={{ pl: 2, py: 1 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {group.title}
                          </Typography>
                          {group.links.map((l, li) => (
                            <ListItemButton key={li} component="a" href={l.url} sx={{ pl: 0 }}>
                              <ListItemIcon>
                                <img src={l.image.src} alt={l.image.alt} width={20} height={20} />
                              </ListItemIcon>
                              <ListItemText primary={l.title} secondary={l.description} />
                            </ListItemButton>
                          ))}
                        </Box>
                      ))}
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </List>

          {/* Mobile Buttons */}
          <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
            {buttons.map((btn, i) => (
              <Button
                key={i}
                fullWidth
                variant={btn.variant === 'secondary' ? 'outlined' : 'contained'}
                size={btn.size === 'sm' ? 'small' : btn.size === 'lg' ? 'large' : 'medium'}
              >
                {btn.title}
              </Button>
            ))}
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
