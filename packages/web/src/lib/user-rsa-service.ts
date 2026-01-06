import { prisma } from '@/lib/prisma';
import { logger } from '@normalfinance/utils';

import { decryptRSAPrivateKey } from './server-rsa-encryption';

export interface UserRSAKeys {
  id: string;
  supabaseUid: string;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyIV: string;
  privateKeySalt: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRSAService {
  static async createUserRSAKeys(
    supabaseUid: string,
    publicKey: string,
    encryptedPrivateKey: string,
    iv: string,
    salt: string
  ): Promise<UserRSAKeys> {
    try {
      const rsaKeys = await prisma.userRSAKeys.upsert({
        where: { supabaseUid },
        update: {
          publicKey,
          encryptedPrivateKey,
          privateKeyIV: iv,
          privateKeySalt: salt,
        },
        create: {
          supabaseUid,
          publicKey,
          encryptedPrivateKey,
          privateKeyIV: iv,
          privateKeySalt: salt,
        },
      });

      logger.log('[UserRSAService] RSA keys created/updated successfully:', {
        supabaseUid: supabaseUid.substring(0, 8) + '...',
      });

      return rsaKeys as UserRSAKeys;
    } catch (error) {
      logger.error('[UserRSAService] Failed to create RSA keys:', error);
      throw error;
    }
  }

  static async getUserRSAKeys(supabaseUid: string): Promise<UserRSAKeys | null> {
    try {
      const rsaKeys = await prisma.userRSAKeys.findUnique({
        where: { supabaseUid },
      });

      return rsaKeys as UserRSAKeys | null;
    } catch (error) {
      logger.error('[UserRSAService] Failed to get RSA keys:', error);
      throw error;
    }
  }

  static async hasRSAKeys(supabaseUid: string): Promise<boolean> {
    try {
      const rsaKeys = await prisma.userRSAKeys.findUnique({
        where: { supabaseUid },
        select: { id: true },
      });

      return !!rsaKeys;
    } catch (error) {
      logger.error('[UserRSAService] Failed to check RSA keys:', error);
      return false;
    }
  }

  static async getDecryptedPrivateKey(
    supabaseUid: string,
    userIdentifier: string
  ): Promise<string> {
    try {
      const rsaKeys = await UserRSAService.getUserRSAKeys(supabaseUid);

      if (!rsaKeys) {
        throw new Error('RSA keys not found for user');
      }

      const privateKey = await decryptRSAPrivateKey(
        rsaKeys.encryptedPrivateKey,
        rsaKeys.privateKeyIV,
        rsaKeys.privateKeySalt,
        userIdentifier
      );

      return privateKey;
    } catch (error) {
      logger.error('[UserRSAService] Failed to get decrypted private key:', error);
      throw error;
    }
  }
}
