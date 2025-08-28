'use client';

import type { Breakpoint } from '@mui/material/styles';
import type { NavSectionProps } from '@/components/template/nav-section';

import { useBoolean } from 'minimal-shared/hooks';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { allLangs, useTranslate } from '@/locales';
import { RestoreModalProvider } from '@/providers/RestoreModalProvider';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { Alert, Button, AlertTitle } from '@mui/material';

import { useSettingsContext } from '@/components/template/settings';
import ZealyHighlight from '@/components/_common/zealy/zealy-highlight';

import { FooterSection } from '../core';
import { NavVertical } from './nav-vertical';
import { NormalNavbar } from './normal-navbar';
import { layoutClasses } from '../core/classes';
import { MainSection } from '../core/main-section';
import { Searchbar } from '../components/searchbar';
import { NormalNavbarDefaults } from './navbar-props';
import { LayoutSection } from '../core/layout-section';
import { AccountDrawer } from '../components/account-drawer';
import { LanguagePopover } from '../components/language-popover';
import { navData as dashboardNavData } from '../nav-config-dashboard';
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

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navData = slotProps?.nav?.data ?? dashboardNavData;

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const handleGiveFeedback = () => {
    // trackEvent('button_clicked', {
    //   label: 'Give feedback / Report bug',
    //   location: '',
    // });
    window.open(' https://forms.fillout.com/t/cumVTceVQeus', '_blank', 'noopener');
  };

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
          searchbar={<Searchbar data={navData} />}
          language={<LanguagePopover data={allLangs} />}
          account={<AccountDrawer />}
        />
      </Box>

      <Box sx={{ height: { xs: HEADER_H.xs, lg: HEADER_H.lg } }} />
    </>
  );

  const renderSidebar = () => (
    <NavVertical
      data={navData}
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      cssVars={navVars.section}
      onToggleNav={() =>
        settings.setField(
          'navLayout',
          settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
        )
      }
    />
  );

  const renderFooter = () => <FooterSection />;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  return (
    <RestoreModalProvider>
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
        <Alert severity="warning" sx={{ m: 2 }}>
          <AlertTitle>{t('Normal Testnet')}&nbsp;🎉</AlertTitle>
          {t(
            'You are using a testnet version of the Normal Protocol. All tokens are NOT real. You WILL experience bugs. Please report all bugs and feedback to our team. Thank you!'
          )}
          <br />
          {/* <Box sx={{ position: 'relative' }}> */}
          <Button variant="contained" color="inherit" sx={{ mt: 1 }} onClick={handleGiveFeedback}>
            {t('Give feedback / Report bug')}
            <ZealyHighlight
              questId={ZEALY_QUEST_IDS.giveFeedback}
              position={{ top: -10, right: -12 }}
            />
          </Button>
        </Alert>

        {renderMain()}
      </LayoutSection>
    </RestoreModalProvider>
  );
}
