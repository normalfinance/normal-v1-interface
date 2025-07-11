import type { BoxProps } from '@mui/material/Box';
import type { IUserProfileCover } from '@/types/user';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import ListItemText from '@mui/material/ListItemText';

// ----------------------------------------------------------------------

export function ProfileCover({
  sx,
  name,
  coverUrl,
  avatarUrl,
  ...other
}: BoxProps & IUserProfileCover) {
  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [`url(${coverUrl})`],
          }),
          height: 1,
          color: 'common.white',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          left: { md: 24 },
          bottom: { md: 24 },
          zIndex: { md: 10 },
          pt: { xs: 6, md: 0 },
          position: { md: 'absolute' },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Avatar
          alt={name}
          src={avatarUrl}
          sx={[
            (theme) => ({
              mx: 'auto',
              width: { xs: 64, md: 128 },
              height: { xs: 64, md: 128 },
              border: `solid 2px ${theme.vars.palette.common.white}`,
            }),
          ]}
        >
          {name?.charAt(0).toUpperCase()}
        </Avatar>

        <ListItemText
          primary={name}
          slotProps={{
            primary: { sx: { typography: 'h4' } },
            secondary: {
              sx: { mt: 0.5, opacity: 0.48, color: 'inherit' },
            },
          }}
          sx={{ mt: 3, ml: { md: 3 }, textAlign: { xs: 'center', md: 'unset' } }}
        />
      </Box>
    </Box>
  );
}
