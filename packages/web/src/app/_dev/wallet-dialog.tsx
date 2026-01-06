import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function WalletDiag() {
  const [info, setInfo] = useState<any>(null);
  const { t } = useTranslate();

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
    <Box sx={{ p: 3 }}>
      <Typography variant="h6">{t('Wallet Diagnostics')}</Typography>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(info, null, 2)}</pre>
      <Typography variant="body2" color="text.secondary">
        {t(
          'If your wallet is installed but not detected, open the wallet once and refresh this page.'
        )}
      </Typography>
    </Box>
  );
}
