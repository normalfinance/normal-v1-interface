import { useEffect } from 'react';
import { xbull } from '@/state/wallet/xbull';
import { lobstr } from '@/state/wallet/lobstr';
import { freighter } from '@/state/wallet/freighter';
import { useAppStore, usePersistStore } from '@/state/store';
import { WalletConnect } from '@normalfinance/utils/build/stellar';

import { Button } from '@mui/material';

import { ConnectWallet } from './connect-wallet';
import { AccountPopover } from './account-popover';

// ----------------------------------------------------------------------

export function AuthArea() {
  const store = useAppStore();
  const storePersist = usePersistStore();

  const connect = async (connector: any) => {
    await storePersist.connectWallet(connector.id);

    return;
  };

  const disconnectWallet = async () => {
    storePersist.disconnectWallet();
    return;
  };

  const token = store.tokens.find(
    (el) => el.id === 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA'
  );

  const tokenBalance = token ? Number(token?.balance) / 10 ** token?.decimals : 0;

  const fetch = async () =>
    await store.fetchTokenInfo('CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA');

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storePersist.wallet.address]);

  if (storePersist.wallet.address)
    return (
      <AccountPopover
        balance={tokenBalance}
        walletAddress={storePersist.wallet.address}
        connectWallet={() => store.setWalletModalOpen(true)}
        disconnectWallet={disconnectWallet}
      />
    );

  return (
    <>
      {!storePersist.wallet.address && (
        <Button
          sx={{ mr: { xs: 3, md: 1 }, padding: { sx: 2, md: 2 } }}
          color="info"
          onClick={() => store.setWalletModalOpen(!store.walletModalOpen)}
        >
          Connect Wallet
        </Button>
      )}

      <ConnectWallet
        open={store.walletModalOpen}
        setOpen={() => store.setWalletModalOpen(!store.walletModalOpen)}
        walletAddress={storePersist.wallet.address}
        connectors={[
          freighter(),
          xbull(),
          lobstr(),
          // @ts-expect-error I don't know
          new WalletConnect({ projectId: 'c23b8cc582d9a0db289b74ddda7bfc6e' }),
        ]}
        connect={connect}
      />
    </>
  );
}
