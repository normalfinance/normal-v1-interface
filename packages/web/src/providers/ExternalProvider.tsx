'use client';

import { useState, useEffect } from 'react';
import { loadStatuspage } from '@normalfinance/utils';

type Props = {
  children: React.ReactNode;
};

export const ExternalProvider = ({ children }: Props) => {
  const [statuspage, setStatuspage] = useState(false);

  useEffect(() => {
    if (!statuspage) {
      loadStatuspage();
      setStatuspage(true);
    }
  }, [statuspage]);

  return children;
};
