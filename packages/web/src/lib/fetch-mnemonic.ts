import type { Session } from '@supabase/supabase-js';
import { logger } from '@normalfinance/utils';
import {
  generateAESKey,
  decryptWithAES,
  exportAESKeyAsBase64,
  importAESKeyFromBase64,
  encryptWithRSAPublicKey,
} from '@/lib/client-crypto';

export async function fetchAndDecryptMnemonic(
  walletAddress: string,
  session: Session | null
): Promise<string | null> {
  if (!session?.user?.id || !session?.user?.email || !session?.access_token) {
    return null;
  }

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };

    const rsaKeysResponse = await fetch('/api/user/rsa-keys', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!rsaKeysResponse.ok) {
      throw new Error('Could not fetch RSA keys');
    }

    const rsaKeysData = await rsaKeysResponse.json();

    if (!rsaKeysData.hasKeys) {
      throw new Error('RSA keys not found');
    }

    const aesKey = await generateAESKey();
    const aesKeyBase64 = await exportAESKeyAsBase64(aesKey);
    const encryptedAESKey = await encryptWithRSAPublicKey(aesKeyBase64, rsaKeysData.publicKey);

    const response = await fetch(`/api/wallets/mnemonic/${walletAddress}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        encryptedAESKey,
      }),
    });

    if (!response.ok) {
      throw new Error('Could not load stored recovery phrase');
    }

    const { encryptedMnemonic, iv } = await response.json();

    const importedAESKey = await importAESKeyFromBase64(aesKeyBase64);
    const decryptedMnemonic = await decryptWithAES(encryptedMnemonic, iv, importedAESKey);

    return decryptedMnemonic;
  } catch (err: any) {
    logger.warn('[fetch-mnemonic] Failed to fetch and decrypt mnemonic:', err);
    return null;
  }
}
