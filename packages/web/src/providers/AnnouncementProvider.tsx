'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// The modal brings a markdown renderer, so it loads only when there is an
// announcement to show, not on every page.
const AnnouncementModal = dynamic(
  () => import('@/components/announcement/announcement-modal').then((m) => m.AnnouncementModal),
  { ssr: false }
);

// ----------------------------------------------------------------------

const ANNOUNCEMENT_STORAGE_KEY = 'announcement_dismissed_';

type AnnouncementProviderProps = {
  children: React.ReactNode;
};

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const [open, setOpen] = useState(false);

  const announcementTitle = process.env.NEXT_PUBLIC_ANNOUNCEMENT_TITLE || '';
  const announcementMessage = process.env.NEXT_PUBLIC_ANNOUNCEMENT_MESSAGE || '';
  const announcementFormat =
    (process.env.NEXT_PUBLIC_ANNOUNCEMENT_FORMAT as 'html' | 'markdown') || 'markdown';
  const storageKey = `${ANNOUNCEMENT_STORAGE_KEY}${announcementTitle}`;

  useEffect(() => {
    if (announcementTitle && announcementMessage) {
      const isDismissed = localStorage.getItem(storageKey);
      if (!isDismissed) {
        setOpen(true);
      }
    }
  }, [announcementTitle, announcementMessage, storageKey]);

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
  };

  return (
    <>
      {children}
      {announcementTitle && announcementMessage && (
        <AnnouncementModal
          open={open}
          onClose={handleClose}
          title={announcementTitle}
          message={announcementMessage}
          format={announcementFormat}
        />
      )}
    </>
  );
}
