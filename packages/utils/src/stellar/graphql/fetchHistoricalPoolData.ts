import { gql } from '@apollo/client';
import { createApolloClient } from './apolloClient';

const GET_POOL_HISTORY = gql`
  query GetPoolHistory($contractId: String!) {
    swaps(orderBy: timestamp_DESC, filter: { contractId: { equalTo: $contractId } }) {
      user
      tokenIn
      tokenOut
      amountIn
      amountOut
      timestamp
    }
    liquidity_deposits(orderBy: timestamp_DESC, filter: { contractId: { equalTo: $contractId } }) {
      user
      tokenIn
      tokenOut
      amountIn
      amountOut
      timestamp
    }
    liquidity_withdrawals(
      orderBy: timestamp_DESC
      filter: { contractId: { equalTo: $contractId } }
    ) {
      user
      tokenIn
      tokenOut
      amountIn
      amountOut
      timestamp
    }
  }
`;

export async function fetchPoolHistory(poolAddress: string) {
  const client = createApolloClient();

  try {
    const { data } = await client.query({
      query: GET_POOL_HISTORY,
      variables: { contractId: poolAddress },
    });
    return data;
  } catch (error) {
    console.log('Error fetching data:', error);
    throw error;
  }
}
