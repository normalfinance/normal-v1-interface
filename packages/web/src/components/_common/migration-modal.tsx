'use client';

import { useTranslate } from '@/locales';

import { Dialog, Typography, DialogTitle, DialogContent } from '@mui/material';

interface MigrationModalProps {
  open: boolean;
  onClose: () => void;
}

export default function MigrationModal({ open, onClose }: MigrationModalProps) {
  const { t } = useTranslate();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 2 }}>
        <Typography variant="h6" component="div">
          {t('🚨 Important Notice: Normal Protocol Evolution')}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" color="text.secondary" align="left">
          {t(
            'The Normal Protocol is evolving from synthetic tokens to real assets, while still focusing on noncustodial, diversification and custom crypto indexes coming soon.'
          )}
        </Typography>
        <br />
        <Typography variant="body2" color="text.secondary" align="left">
          {t(
            'All synthetic positions have been closed, and any remaining USDC balances will be automatically returned to their respective wallet addresses. No action is required on your part.'
          )}
        </Typography>
        <br />
        <Typography variant="body2" color="text.secondary" align="left">
          {t(
            'Please allow time for transactions to be processed on-chain. You can monitor your wallet for incoming funds.'
          )}
        </Typography>
        <br />
        <Typography variant="body2" color="text.secondary" align="left">
          {t(
            'Normal will be releasing a new critical update in the coming days for a brighter and more Normal future together! This update will include an existing Normal noncustodial wallet with XLM and USDC, and the top crypto assets, BTC, ETH, SOL, XRP, ADA coming directly after. We are also releasing a new Savings feature where you can earn passive APY % on your USDC.'
          )}
        </Typography>
        <br />
        <Typography variant="body2" color="text.secondary" align="left">
          {t(
            'Normal will be releasing a new critical update in the coming days for a brighter and more Normal future together! This update will include an existing Normal noncustodial wallet with XLM and USDC, and the top crypto assets, BTC, ETH, SOL, XRP, ADA coming directly after. We are also releasing a new Savings feature where you can earn passive APY % on your USDC.'
          )}
        </Typography>
        <br />
        <Typography variant="body2" color="text.secondary" align="left">
          {t(
            'If you have any questions or experience any issues, please contact our support team. We sincerely thank you for your support and participation in Normal, and thrilled for the next chapter! Making Crypto Normal 😎 '
          )}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
