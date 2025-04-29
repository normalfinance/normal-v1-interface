export interface Token {
  id: number;
  logo?: string;
  url: string;
  name: string;
  shortname: string;
  owned: boolean;
  countstatus: number;
  pricestatus: number;
  featured: boolean;
  address: string;
}
