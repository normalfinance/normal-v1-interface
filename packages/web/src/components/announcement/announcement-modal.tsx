'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';

// ----------------------------------------------------------------------

type AnnouncementModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  format: 'html' | 'markdown';
};

export function AnnouncementModal({
  open,
  onClose,
  title,
  message,
  format,
}: AnnouncementModalProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 2 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {format === 'markdown' ? (
          <Typography variant="body1" component="div">
            <ReactMarkdown>{message}</ReactMarkdown>
          </Typography>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: message }} />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
