'use client';

import { useTranslate } from '@/locales';
import { MUTED } from '@/theme/brand-colors';
import { ModalType } from '@normalfinance/types';
import { useAppStore } from '@normalfinance/state';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import Typography from '@mui/material/Typography';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';

import { WalletGate } from '@/components/_common/wallet-gate';
import { BOX_PX, RowIcon, ListRow, RowList, AppBlock } from '@/components/_common/app-ui';

/**
 * "Need USDC?": the two ways to bring digital dollars in, as rows of the app's
 * lists (2026-11-08: was a hand-coloured card from before the app style).
 */
export function SavingsOnrampCard() {
  const { t } = useTranslate();
  const { setModalView } = useAppStore();
  const { startAction } = useAssetActionsContext();

  return (
    <AppBlock flush open title={t('Need USDC?')}>
      <Typography
        className="nf-label"
        sx={{ px: BOX_PX, pt: 1.75, pb: 0.25, fontSize: 13.5, color: MUTED }}
      >
        {t('Add funds to start earning.')}
      </Typography>
      <RowList>
        <WalletGate
          buttonText={t('Login to deposit cash')}
          fullWidth
          variant="soft"
          requireWalletConnection={false}
        >
          <ListRow
            icon={
              <RowIcon>
                <AccountBalanceOutlined />
              </RowIcon>
            }
            title={t('Deposit cash')}
            subtitle={t('Bank transfer or card via MoneyGram')}
            onClick={() => setModalView(ModalType.ON_RAMP, true)}
          />
        </WalletGate>
        <WalletGate buttonText={t('Login to deposit crypto')} fullWidth variant="soft">
          <ListRow
            icon={
              <RowIcon>
                <AccountBalanceWalletOutlined />
              </RowIcon>
            }
            title={t('Deposit crypto')}
            subtitle={t('Send from any external wallet')}
            onClick={() => startAction('receive')}
          />
        </WalletGate>
      </RowList>
    </AppBlock>
  );
}
