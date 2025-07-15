import { gql } from '@apollo/client';
import { createApolloClient } from './apolloClient';
import { TimeEpoch } from '@normalfinance/types';
import { getTimestampAgo } from '../../time';

// Queries

const GET_POOL_VOLUME_SINCE = gql`
  query GetVolumeSince($poolId: String!, $timestampAgo: BigInt!) {
    swaps(filter: { poolId: { equalTo: $poolId }, timestamp: { greaterThan: $timestampAgo } }) {
      nodes {
        amountIn
        amountOut
      }
    }
  }
`;

// Hooks

export async function fetchPoolVolumeSince(poolAddress: string, timeEpoch: TimeEpoch) {
  const timestamp = getTimestampAgo(timeEpoch);

  const client = createApolloClient();

  try {
    const { data } = await client.query({
      query: GET_POOL_VOLUME_SINCE,
      variables: { poolId: poolAddress, timestampAgo: timestamp },
    });

    const volume = data.reduce(
      (acc: { amountIn: bigint; amountOut: bigint }, swap: any) => ({
        amountIn: acc.amountIn + BigInt(swap.amountIn),
        amountOut: acc.amountOut + BigInt(swap.amountOut),
      }),
      { amountIn: BigInt(0), amountOut: BigInt(0) }
    );

    return volume;
  } catch (error) {
    console.log('Error fetching data:', error);
    throw error;
  }
}
