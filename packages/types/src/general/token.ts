export interface Token {
  name: string;
  icon?: string;
  usdValue?: number;
  amount?: number;
  category?: string;
  id: number;
  url: string;
  logo?: string;
  shortname: string;
  owned: boolean;
  countstatus: number;
  pricestatus: number;
  featured: boolean;
  address: string;
  decimals?: number;
}

export type NativeToken = 'SOL' | 'XLM';
