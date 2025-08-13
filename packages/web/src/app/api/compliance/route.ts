import type { NextRequest } from 'next/server';

import { AML } from 'elliptic-sdk';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    const { client } = new AML({
      key: process.env.ELLIPTIC_API_KEY ?? '',
      secret: process.env.ELLIPTIC_API_SECRET ?? '',
    });

    const requestBody = {
      subject: {
        asset: 'holistic',
        blockchain: 'holistic',
        type: 'address',
        hash: walletAddress,
      },
      type: 'wallet_exposure',
    };

    const response = await client.post('/v2/wallet/synchronous', requestBody);

    const info = response.data as WalletExposure;

    // if (!response || !response.data) {
    //   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    // }

    return NextResponse.json({ allowed: info.risk_score === 0 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Compliance validation failed' },
      { status: 500 }
    );
  }
}

export interface WalletExposure {
  analysed_by: {
    id: string; // UUID
    type: string; // e.g., "api_key"
  };
  cluster_entities: ClusterEntity[];

  id: string; // UUID
  screening_id: string; // UUID

  subject: {
    asset: string; // e.g., "holistic"
    hash: string; // address/hash
    type: string; // e.g., "address"
    blockchain: string; // e.g., "holistic"
  };

  type: string; // e.g., "wallet_exposure"

  customer: {
    reference: string;
  };

  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  analysed_at: string; // ISO datetime

  process_status: string; // e.g., "complete"
  process_status_id: number;
  workflow_status_id: number;
  workflow_status: string; // e.g., "active"

  error: string | null;

  asset_tier: string; // e.g., "full"
  risk_score: number;

  blockchain_info: {
    cluster: {
      inflow_value: MoneyValueUSD;
      outflow_value: MoneyValueUSD;
    };
  };

  risk_score_detail: {
    destination: number;
    source: number;
  };

  evaluation_detail: {
    source: RuleEvaluation[];
    destination: RuleEvaluation[];
  };

  contributions: {
    source: ContributionItem[];
    destination: ContributionItem[];
  };

  changes: {
    risk_score_change: number;
  };
}

export interface ClusterEntity {
  name: string;
  category: string;
  is_primary_entity: boolean;
  is_vasp: boolean;
}

export interface MoneyValueUSD {
  usd: number;
}

export interface RuleEvaluation {
  rule_id: string; // UUID
  risk_score: number;
  matched_elements: MatchedElement[];
  rule_name: string;
}

export interface MatchedElement {
  contributions: MatchedContribution[];
  category: string;
  contribution_percentage: number;
  contribution_value: MoneyValueUSD;
}

export interface MatchedContribution {
  risk_triggers: {
    category_id: string; // UUID
    category: string;
    is_sanctioned: boolean;
  };
  contribution_percentage: number;
  entity: string; // entity name
  contribution_value: MoneyValueUSD;
}

export interface ContributionItem {
  entities: ContributionEntity[];
  contribution_percentage: number;
  contribution_value: MoneyValueUSD;
}

export interface ContributionEntity {
  name: string;
  category: string;
  is_primary_entity: boolean;
  is_vasp: boolean;
}
