import type { AxiosHeaders } from 'axios';

import axios from 'axios';
import { buildAuthHeaders } from '@/utils/http';

export interface CreateUserRequest {
  walletAddress: string;
}

export interface CreateReferralRequest {
  referrerWalletAddress: string;
  customCode?: string;
  source?: string;
  campaign?: string;
}

export interface ActivateReferralRequest {
  code: string;
  refereeWalletAddress: string;
}

export interface RecordActionRequest {
  userWalletAddress: string;
  referralCode: string;
  action: string;
  metadata?: {
    amount?: string;
    tokenSymbol?: string;
    [key: string]: any;
  };
}

export class ReferralAPI {
  private static baseUrl = '/api/referral';

  static async getUser(walletAddress: string) {
    const headers = await buildAuthHeaders();
    const response = await axios.get(`${this.baseUrl}/user`, {
      params: { walletAddress },
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async createUser(data: CreateUserRequest) {
    const headers = await buildAuthHeaders();
    const response = await axios.post(`${this.baseUrl}/user`, data, {
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async createReferralCode(data: CreateReferralRequest) {
    const headers = await buildAuthHeaders();
    const response = await axios.post(`${this.baseUrl}/codes`, data, {
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async getReferralByCode(code: string) {
    const headers = await buildAuthHeaders();
    const response = await axios.get(`${this.baseUrl}/codes`, {
      params: { code },
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async activateReferral(data: ActivateReferralRequest) {
    const headers = await buildAuthHeaders();
    const response = await axios.post(`${this.baseUrl}/activate`, data, {
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async recordAction(data: RecordActionRequest) {
    const headers = await buildAuthHeaders();
    const response = await axios.post(`${this.baseUrl}/actions`, data, {
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async getUserActions(userWalletAddress: string, referralCode?: string) {
    const headers = await buildAuthHeaders();
    const response = await axios.get(`${this.baseUrl}/actions`, {
      params: { userWalletAddress, referralCode },
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async getReferralStats(walletAddress: string) {
    const headers = await buildAuthHeaders();
    const response = await axios.get(`${this.baseUrl}/stats`, {
      params: { walletAddress },
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }

  static async getUserReferrals(walletAddress: string) {
    const headers = await buildAuthHeaders();
    const response = await axios.get(`${this.baseUrl}/user`, {
      params: { walletAddress },
      headers: headers as AxiosHeaders,
    });
    return response.data;
  }
}

export function isReferralAPIError(error: any): error is { response: { data: { error: string } } } {
  return error?.response?.data?.error;
}

export function getReferralAPIErrorMessage(error: any): string {
  if (isReferralAPIError(error)) {
    return error.response.data.error;
  }
  return 'An unexpected error occurred';
}
