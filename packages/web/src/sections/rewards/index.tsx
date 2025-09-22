'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { RouterLink } from '@/routes/components';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { usePathname, useSearchParams } from '@/routes/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import { Button } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { WalletGate } from '@/components/_common/wallet-gate';
import MoneyGramTransactionsTable from '@/components/_common/moneygram-history-table';

import { ProfileCover } from './profile-cover';
import { ZealyProgress } from './zealy-progress';
import { ProtocolPoints } from './protocol-points';
import { RewardsOverview } from './rewards-overview';

import { listTransactions } from '@/lib/mgi/history';
import { getMgiAuthToken } from '@/lib/mgi/client';

const MOCK_MODE = process.env.NEXT_PUBLIC_MGI_MOCK === '1';

interface User {
  id: string;
  displayName: string;
  photoURL: string;
}

interface UserAbout {
  role: string;
  coverUrl: string;
}

// ----------------------------------------------------------------------

const USER_DATA = {
  user: {
    id: 'u001',
    photoURL: '/assets/avatar/avatar_1.jpg',
  } as User,

  about: {
    role: 'Product Designer',
    coverUrl: '/assets/images/normal-images/normal-gradient.webp',
  } as UserAbout,
};

const NAV_ITEMS = [
  { value: '', label: 'Overview', icon: <Iconify width={24} icon="solar:user-id-bold" /> },
  { value: 'zealy', label: 'Zealy', icon: <Iconify width={24} icon="solar:heart-bold" /> },
  {
    value: 'protocol',
    label: 'Protocol',
    icon: <Iconify width={24} icon="eva:more-horizontal-fill" />,
  },
  { value: 'moneygram', label: 'MoneyGram', icon: <Iconify width={24} icon="mdi:bank-outline" /> }, // ← NEW
];

const TAB_PARAM = 'tab';

const REWARDS_OVERVIEW = {
  referralLink: 'https://normal.finance/ref/Jane123',
  referralsCount: 0,
  zealyUrl: 'https://zealy.io/c/normal',
  zealyXP: 0,
  protocolPoints: 0,
  referrals: [
    // { id: '1', address: '0xA1...C4', joined: '2025-06-01', points: 120 },
    // { id: '2', address: '0xB2...D5', joined: '2025-06-03', points: 90 },
    // { id: '3', address: '0xC3...E6', joined: '2025-06-07', points: 60 },
  ],
};

const POINTS_DATA = {
  totalPoints: 0,
  history: [
    // { date: '2025-07-08', points: 150, action: 'Swap' },
    // { date: '2025-07-07', points: 75, action: 'Provide Liquidity' },
    // { date: '2025-07-05', points: 200, action: 'Stake LP' },
  ],
};

// ----------------------------------------------------------------------

export function RewardsView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get(TAB_PARAM) ?? '';
  const walletAddress = usePersistStore((s) => s.wallet.address);
  const { t } = useTranslate();

  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let on = true;
    (async () => {
      if (selectedTab !== 'moneygram' || !walletAddress) return;
      setLoading(true);
      setError(null);

      try {
        // Mock: no token needed
        if (MOCK_MODE) {
          const tx = await listTransactions({ account: walletAddress });
          if (on) setRows(tx as any[]);
          return;
        }

        // Live: need SEP-10 token
        let token = await getMgiAuthToken(walletAddress);
        try {
          const tx = await listTransactions({ account: walletAddress, authToken: token });
          if (on) setRows(tx as any[]);
        } catch (e: any) {
          const msg = String(e?.message || '');
          const is401 =
            /401/.test(msg) ||
            /unauthorized/i.test(msg) ||
            /expired/i.test(msg) ||
            /invalid/i.test(msg);

          if (is401) {
            // Re-auth once if expired
            token = await getMgiAuthToken(walletAddress);
            const tx = await listTransactions({ account: walletAddress, authToken: token });
            if (on) setRows(tx as any[]);
          } else {
            throw e;
          }
        }
      } catch (e: any) {
        if (on) setError(e?.message || 'Failed to load MoneyGram history');
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [selectedTab, walletAddress]);

  React.useEffect(() => {
    let on = true;

    (async () => {
      // only run on MoneyGram tab with a connected wallet
      if (selectedTab !== 'moneygram' || !walletAddress) {
        // optional: clear state when leaving the tab or disconnecting
        if (on) {
          setRows([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (MOCK_MODE) {
          const tx = await listTransactions({ account: walletAddress });
          if (on) setRows(tx as any[]);
          return;
        }

        // 1) Try with a cached/valid SEP-10 token (no popup if still valid)
        let token = await getMgiAuthToken(walletAddress);

        try {
          const tx = await listTransactions({ account: walletAddress, authToken: token });
          if (on) setRows(tx as any[]);
        } catch (e: any) {
          const msg = String(e?.message || '');
          const is401 =
            /401/.test(msg) ||
            /unauthorized/i.test(msg) ||
            /expired/i.test(msg) ||
            /invalid/i.test(msg);

          if (!is401) throw e;

          // 2) If server rejected the token, clear cache & re-auth ONCE
          const { clearMgiToken } = await import('@/lib/mgi/client');
          clearMgiToken(walletAddress);

          token = await getMgiAuthToken(walletAddress); // will prompt once if needed
          const tx = await listTransactions({ account: walletAddress, authToken: token });
          if (on) setRows(tx as any[]);
        }
      } catch (e: any) {
        if (on) setError(e?.message || 'Failed to load MoneyGram history');
      } finally {
        if (on) setLoading(false);
      }
    })();

    return () => {
      on = false;
    };
  }, [selectedTab, walletAddress]);

  const createRedirectPath = (currentPath: string, query: string) => {
    const q = new URLSearchParams({ [TAB_PARAM]: query }).toString();
    return query ? `${currentPath}?${q}` : currentPath;
  };

  const { user, about } = USER_DATA;

  const walletLabel =
    walletAddress && walletAddress.length > 0
      ? format.fTruncate(walletAddress, 12)
      : t('Not connected');

  return (
    <DashboardContent>
      <Card sx={{ mb: 3, height: 290 }}>
        <ProfileCover name={walletLabel} avatarUrl={user.photoURL} coverUrl={about.coverUrl} />

        <Box
          sx={{
            width: 1,
            bottom: 0,
            zIndex: 9,
            px: { md: 3 },
            display: 'flex',
            position: 'absolute',
            bgcolor: 'background.paper',
            justifyContent: { xs: 'center', md: 'flex-end' },
          }}
        >
          <Tabs value={selectedTab}>
            {NAV_ITEMS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                icon={tab.icon}
                label={tab.label}
                component={RouterLink}
                href={createRedirectPath(pathname, tab.value)}
              />
            ))}
          </Tabs>
        </Box>
      </Card>

      {/* ---- Tab panels ----------------------------------------------------- */}
      {selectedTab === '' && (
        <WalletGate buttonText={t('Connect Wallet to view rewards')} fullWidth>
          <RewardsOverview
            referralsCount={REWARDS_OVERVIEW.referralsCount}
            zealyUrl={REWARDS_OVERVIEW.zealyUrl}
            zealyXP={REWARDS_OVERVIEW.zealyXP}
            protocolPoints={REWARDS_OVERVIEW.protocolPoints}
            referrals={REWARDS_OVERVIEW.referrals}
          />
        </WalletGate>
      )}
      {selectedTab === 'zealy' && (
        <WalletGate buttonText={t('Connect Wallet to view Zealy')} fullWidth>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              href="https://zealy.io/cw/normalfinance/questboard"
              target="_blank"
              rel="noopener"
              sx={{ mb: 2 }}
              startIcon={<Iconify icon="eva:external-link-outline" width={18} />}
              // onClick={() =>
              //   trackEvent('button_clicked', {
              //     label: 'Manage Stake',
              //     location: 'Insurance',
              //   })
              // }
            >
              {t('Go to Zealy')}
            </Button>

            <ZealyProgress community="normalfinance" />
          </Box>
        </WalletGate>
      )}

      {selectedTab === 'protocol' && (
        <WalletGate buttonText={t('Connect Wallet to view Protocol Points')} fullWidth>
          <ProtocolPoints totalPoints={POINTS_DATA.totalPoints} history={POINTS_DATA.history} />
        </WalletGate>
      )}

      {selectedTab === 'moneygram' && (
        <WalletGate buttonText={t('Connect Wallet to view MoneyGram history')} fullWidth>
          {error && <Box sx={{ color: 'error.main', fontSize: 13, mb: 1 }}>{error}</Box>}
          <MoneyGramTransactionsTable rows={rows} loading={loading} />
        </WalletGate>
      )}
    </DashboardContent>
  );
}
