'use client';

import type { Breakpoint } from '@mui/material/styles';
import type { NavSectionProps } from '@/components/template/nav-section';

import { useBoolean } from '@/hooks';
import { paths } from '@/routes/paths';
import { isTestnet } from '@normalfinance/utils';
import { allLangs, useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Alert, Button, AlertTitle } from '@mui/material';

import MigrationModal from '@/components/_common/migration-modal';
import { useSettingsContext } from '@/components/template/settings';

import { FooterSection } from '../core';
import { NormalNavbar } from './normal-navbar';
import { layoutClasses } from '../core/classes';
import { MainSection } from '../core/main-section';
import { NormalNavbarDefaults } from './navbar-props';
import { LayoutSection } from '../core/layout-section';
import { AccountDrawer } from '../components/account-drawer';
import { LanguagePopover } from '../components/language-popover';
import { NetworkToggle, NETWORK_SWITCH_ENABLED } from '../components/network-toggle';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';

import type { MainSectionProps } from '../core/main-section';
import type { HeaderSectionProps } from '../core/header-section';
import type { LayoutSectionProps } from '../core/layout-section';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    nav?: {
      data?: NavSectionProps['data'];
    };
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const { t } = useTranslate();

  const theme = useTheme();

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';

  const handleGiveFeedback = () => {
    window.open(paths.help.feedbackForm, '_blank', 'noopener');
  };

  const moreInfoOpen = useBoolean();

  const HEADER_H = { xs: 64, lg: 72 };

  const renderNormalNavbar = () => (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: (_theme) => _theme.zIndex.appBar,
        }}
      >
        <NormalNavbar
          logo={NormalNavbarDefaults.logo}
          links={NormalNavbarDefaults.links}
          buttons={NormalNavbarDefaults.buttons}
          networkToggle={NETWORK_SWITCH_ENABLED ? <NetworkToggle /> : undefined}
          language={<LanguagePopover data={allLangs} />}
          account={<AccountDrawer />}
        />
      </Box>

      <Box sx={{ height: { xs: HEADER_H.xs, lg: HEADER_H.lg } }} />
    </>
  );

  const renderSidebar = () => null;

  const renderFooter = () => <FooterSection />;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderNormalNavbar()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={isNavHorizontal ? null : renderSidebar()}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* Migration Alert */}
      <Alert severity="info" sx={{ m: 2 }}>
        <AlertTitle>{t('🚨 Important Notice: Normal Protocol Evolution')}</AlertTitle>
        {t(
          'The Normal Protocol is evolving from synthetic tokens to real assets, while still focusing on noncustodial, diversification and custom crypto indexes coming soon.'
        )}
        <br />
        {t(
          'All synthetic positions have been closed, and any remaining USDC balances will be automatically returned to their respective wallet addresses. No action is required on your part.'
        )}
        <br />
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Button variant="contained" color="inherit" sx={{ mt: 1 }} onClick={moreInfoOpen.onTrue}>
            {t('More info')}
          </Button>
        </Box>
      </Alert>

      <MigrationModal open={moreInfoOpen.value} onClose={moreInfoOpen.onFalse} />

      {/* Testnet Alert */}
      {isTestnet() && (
        <Alert severity="warning" sx={{ m: 2 }}>
          <AlertTitle>{t('Normal Testnet')}&nbsp;🎉</AlertTitle>
          {t(
            'You are using a testnet version of the Normal Protocol. All tokens are NOT real. You WILL experience bugs. Please report all bugs and feedback to our team. Thank you!'
          )}
          <br />
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Button
              variant="contained"
              sx={(thm) => ({
                mt: 1,
                bgcolor: thm.palette.grey[100],
                color: thm.palette.grey[900],
                '&:hover': {
                  bgcolor: thm.palette.grey[200],
                },
                ...thm.applyStyles('dark', {
                  bgcolor: thm.palette.grey[800],
                  color: thm.palette.common.white,
                  '&:hover': { bgcolor: thm.palette.grey[700] },
                }),
              })}
              onClick={handleGiveFeedback}
            >
              {t('Give feedback / Report bug')}
            </Button>
          </Box>
        </Alert>
      )}

      {renderMain()}
    </LayoutSection>
  );
}
