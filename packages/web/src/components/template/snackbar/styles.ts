import { MaterialDesignContent } from 'notistack';

// @mui
import { alpha, styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const StyledNotistack = styled(MaterialDesignContent)(({ theme }) => {
  const isLight = theme.palette.mode === 'light';

  return {
    '& #notistack-snackbar': {
      ...theme.typography.subtitle2,
      padding: 0,
      flexGrow: 1,
    },
    '&.notistack-MuiContent': {
      padding: theme.spacing(0.5),
      paddingRight: theme.spacing(2),
      color: theme.palette.text.primary,
      boxShadow: 'none',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 'var(--radius-md)',
      backgroundColor: theme.palette.background.paper,
    },
    '&.notistack-MuiContent-default': {
      padding: theme.spacing(1),
      border: 'none',
      color: isLight ? theme.palette.common.white : theme.palette.grey[900],
      backgroundColor: isLight ? theme.palette.grey[900] : theme.palette.common.white,
    },
    // '&.notistack-MuiContent-info': {},
    // '&.notistack-MuiContent-success': {},
    // '&.notistack-MuiContent-warning': {},
    // '&.notistack-MuiContent-error': {},
  };
});

// ----------------------------------------------------------------------

type StyledIconProps = {
  color: 'info' | 'success' | 'warning' | 'error';
};

export const StyledIcon = styled('span')<StyledIconProps>(({ color, theme }) => ({
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(1.5),
  color: theme.palette[color].main,
  borderRadius: 'var(--radius-md)',
  backgroundColor: alpha(theme.palette[color].main, 0.16),
}));
