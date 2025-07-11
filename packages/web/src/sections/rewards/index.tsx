'use client';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { RouterLink } from '@/routes/components';
import { usePathname, useSearchParams } from '@/routes/hooks';

import { DashboardContent } from '@/layouts/dashboard';

import { Iconify } from '@/components/template/iconify';

import { ProfileCover } from './profile-cover';
import { RewardsOverview } from './rewards-overview';
import { ZealyProgress } from './zealy-progress';
import { ProtocolPoints } from './protocol-points';

import { usePersistStore } from '@normalfinance/state';
import { format } from '@normalfinance/utils';
import { Button } from '@mui/material';

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
    displayName: 'Jane Normal',
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

  const createRedirectPath = (currentPath: string, query: string) => {
    const q = new URLSearchParams({ [TAB_PARAM]: query }).toString();
    return query ? `${currentPath}?${q}` : currentPath;
  };

  const { user, about } = USER_DATA;

  const referralLink = `https://app.normalfinance.io/ref/${walletAddress}`;
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
        <RewardsOverview
          referralLink={referralLink}
          referralsCount={REWARDS_OVERVIEW.referralsCount}
          zealyUrl={REWARDS_OVERVIEW.zealyUrl}
          zealyXP={REWARDS_OVERVIEW.zealyXP}
          protocolPoints={REWARDS_OVERVIEW.protocolPoints}
          referrals={REWARDS_OVERVIEW.referrals}
        />
      )}
      {selectedTab === 'zealy' && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            href="https://zealy.io/cw/normalfinance/questboard"
            target="_blank"
            rel="noopener"
            sx={{ mb: 2 }}
            startIcon={<Iconify icon="solar:external-link-bold" width={18} />}
          >
            {t('Go to Zealy')}
          </Button>

          <ZealyProgress community="normalfinance" />
        </Box>
      )}

      {selectedTab === 'protocol' && (
        <ProtocolPoints totalPoints={POINTS_DATA.totalPoints} history={POINTS_DATA.history} />
      )}
    </DashboardContent>
  );
}
