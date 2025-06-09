'use client';

import { useEffect, useState } from 'react';

// Crisp
import { load as loadCrisp } from '@normalfinance/utils';

// StatusPage
import { load as loadStatuspage } from '@normalfinance/utils';

type Props = {
  children: React.ReactNode;
};

export const ExternalProvider = ({ children }: Props) => {
  const [crisp, setCrisp] = useState(false);
  const [statuspage, setStatuspage] = useState(false);

  useEffect(() => {
    if (!crisp) {
      loadCrisp();
      setCrisp(true);
    }
  }, [crisp]);

  useEffect(() => {
    if (!statuspage) {
      loadStatuspage();
      setStatuspage(true);
    }
  }, [statuspage]);

  return children;
};
