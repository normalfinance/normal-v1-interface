import { gql } from '@apollo/client';
import { createApolloClient } from './apolloClient';
import { TimeEpoch } from '@normalfinance/types';
import { getTimestampAgo } from '../../time';

const GET_ALL_POOLS_VOLUME_SINCE = gql`
  query GetTotalVolumeSince($timestampAgo: BigInt!) {
    swaps(filter: { timestamp: { greaterThan: $timestampAgo } }) {
      nodes {
        amountIn
        amountOut
      }
    }
  }
`;

export async function fetchAllPoolsVolumeSince(timeEpoch: TimeEpoch) {
  const timestamp = getTimestampAgo(timeEpoch);

  const client = createApolloClient();

  try {
    const { data } = await client.query({
      query: GET_ALL_POOLS_VOLUME_SINCE,
      variables: { timestampAgo: timestamp },
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
