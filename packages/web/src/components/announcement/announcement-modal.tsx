'use client';

import { useTranslate } from '@/locales';
import ReactMarkdown from 'react-markdown';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

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
  const { t } = useTranslate();
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
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
