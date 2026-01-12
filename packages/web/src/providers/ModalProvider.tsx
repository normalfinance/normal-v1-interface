'use client';

import { ModalType } from '@normalfinance/types';
import { useAppStore, usePersistStore } from '@normalfinance/state';

// components
import OnRampDialog from '@/components/_common/onramp-dialog';
import OffRampDialog from '@/components/_common/offramp-dialog';
import AddLiquidityDialog from '@/components/_earn-page-components/add-liquidity-dialog';
import WithdrawLiquidityDialog from '@/components/_earn-page-components/withdraw-liquidity-dialog';

import ReceiveModal from '../components/_common/receive-modal';

// ----------------------------------------------------------------------

type ModalProviderProps = {
  children: React.ReactNode;
};

export function ModalProvider({ children }: ModalProviderProps) {
  const { modalState, setModalView } = useAppStore();
  const { wallet } = usePersistStore();

  return (
    <>
      {children}

      {modalState.ON_RAMP && (
        <OnRampDialog
          open={modalState.ON_RAMP}
          amount="100"
          onClose={() => setModalView(ModalType.ON_RAMP, false)}
          walletAddress={wallet.address || ''}
        />
      )}

      {modalState.OFF_RAMP && (
        <OffRampDialog
          open={modalState.OFF_RAMP}
          amount="100"
          onClose={() => setModalView(ModalType.OFF_RAMP, false)}
          walletAddress={wallet.address || ''}
        />
      )}

      {modalState.DEPOSIT_CRYPTO && (
        <ReceiveModal
          open={modalState.DEPOSIT_CRYPTO}
          onClose={() => setModalView(ModalType.DEPOSIT_CRYPTO, false)}
        />
      )}

      {/* Liquidity */}
      {modalState.ADD_LIQUIDITY && (
        <AddLiquidityDialog
          open={modalState.ADD_LIQUIDITY}
          onClose={() => setModalView(ModalType.ADD_LIQUIDITY, false)}
        />
      )}
      {modalState.REMOVE_LIQUIDITY && (
        <WithdrawLiquidityDialog
          open={modalState.REMOVE_LIQUIDITY}
          onClose={() => setModalView(ModalType.REMOVE_LIQUIDITY, false)}
        />
      )}
    </>
  );
}
