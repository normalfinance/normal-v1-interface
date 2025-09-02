import { useEffect, useState } from 'react';

export default function WalletDiag() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    const w: any = window;
    setInfo({
      // basic presence
      hasFreighterApi: !!w.freighterApi,
      hasXbull: !!w.xbull,
      hasXBull: !!w.xBull,
      hasAlbedo: !!w.albedo,
      hasLobstr: !!w.lobstr,
      hasHana: !!w.hana,
      hasStellarReq: !!w.stellar?.request,

      // method presence
      freighter_signTransaction: !!w.freighterApi?.signTransaction,
      xbull_signTransaction: !!w.xbull?.signTransaction,
      xbull_signXDR: !!w.xbull?.signXDR,
      XBull_signTransaction: !!w.xBull?.signTransaction,
      XBull_signXDR: !!w.xBull?.signXDR,
      albedo_tx: !!w.albedo?.tx,
      lobstr_signXDR: !!w.lobstr?.signXDR,
      hana_stellar_request: !!w.hana?.stellar?.request,
      stellar_request: !!w.stellar?.request,
    });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h3>Wallet Diagnostics</h3>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(info, null, 2)}</pre>
      <p>
        If your wallet is installed but not detected, open the wallet once and refresh this page.
      </p>
    </div>
  );
}
