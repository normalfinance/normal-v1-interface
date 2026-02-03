'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { RouterLink } from '@/routes/components';
import { getMgiAuthToken } from '@/lib/mgi/client';
import { listTransactions } from '@/lib/mgi/history';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { usePathname, useSearchParams } from '@/routes/hooks';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { Iconify } from '@/components/template/iconify';
import { WalletGate } from '@/components/_common/wallet-gate';
import MoneyGramTransactionsTable from '@/components/_common/moneygram-history-table';

import { ProfileCover } from './profile-cover';
import { RewardsOverview } from './rewards-overview';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  { value: '', label: 'Overview', icon: <Iconify width={24} icon="solar:user-id-bold" /> },
  { value: 'moneygram', label: 'MoneyGram', icon: <Iconify width={24} icon="mdi:bank-outline" /> },
];

const TAB_PARAM = 'tab';

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

  const { session } = useSupabaseAuth();

  const avatarURL = cdn('logo/logo-single.svg');

  const userMetadata = session?.user?.user_metadata as
    | { picture?: string; avatar_url?: string; name?: string }
    | undefined;
  const userEmail = session?.user?.email ?? '';
  const userAvatar = userMetadata?.picture || userMetadata?.avatar_url || avatarURL;
  const displayName = userMetadata?.name || userEmail || ' ';

  return (
    <DashboardContent>
      <Card sx={{ mb: 3, height: 290 }}>
        <ProfileCover
          name={displayName}
          avatarUrl={userAvatar}
          coverUrl={cdn('/placeholders/normal-background.png')}
        />

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
        <WalletGate buttonText={t('Login to view rewards')} fullWidth>
          <RewardsOverview referralsCount={0} referrals={[]} />
        </WalletGate>
      )}

      {selectedTab === 'moneygram' && (
        <WalletGate buttonText={t('Login to view MoneyGram history')} fullWidth>
          {error && <Box sx={{ color: 'error.main', fontSize: 13, mb: 1 }}>{error}</Box>}
          <MoneyGramTransactionsTable rows={rows} loading={loading} />
        </WalletGate>
      )}
    </DashboardContent>
  );
}
