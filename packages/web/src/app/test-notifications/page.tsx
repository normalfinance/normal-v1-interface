'use client';

import { useContractTransaction } from '@/hooks/use-contract-transaction';
import { TransactionType } from '@/types/transaction';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const MOCK_TX_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

export default function TestNotificationsPage() {
  const { executeContractTransaction } = useContractTransaction();

  const runScenario = (type: TransactionType, success: boolean) => {
    const transactionDetails = {
      type,
      token1: { name: 'BTC', amount: '1.23' },
      token2: { name: 'USDC', amount: '50000' },
    };

    executeContractTransaction({
      contractType: 'pool', // Mock contract type
      contractAddress: '0xmockaddress',
      transactionDetails,
      transactionFunction: () =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            if (success) {
              resolve({
                hash: MOCK_TX_HASH,
                // Mock signAndSend to simulate async transaction signing and sending
                signAndSend: () =>
                  new Promise((resolveSign) => {
                    setTimeout(() => {
                      resolveSign({
                        sendTransactionResponse: { hash: MOCK_TX_HASH },
                      });
                    }, 1500); // Simulate signing/sending delay
                  }),
              } as any);
            } else {
              reject(new Error('User rejected transaction'));
            }
          }, 2000); // Simulate a 2 second transaction delay
        }),
    });
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 5 }}>
        Test Transaction Notifications
      </Typography>

      <Stack spacing={2}>
        {Object.values(TransactionType).map((type) => (
          <Stack key={type} direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ minWidth: '200px' }}>
              {type}
            </Typography>
            <Button variant="contained" color="success" onClick={() => runScenario(type, true)}>
              Test Success
            </Button>
            <Button variant="contained" color="error" onClick={() => runScenario(type, false)}>
              Test Failure
            </Button>
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}
