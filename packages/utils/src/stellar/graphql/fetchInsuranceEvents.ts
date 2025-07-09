import { gql } from '@apollo/client';
import { createApolloClient } from './apolloClient';

const GET_INSURANCE_FUND_EVENT_HISTORY = gql`
  query GetPoolHistory($contractId: String!) {
    swaps(orderBy: timestamp_DESC, filter: { contractId: { equalTo: $contractId } }) {
      user
      tokenIn
      tokenOut
      amountIn
      amountOut
      timestamp
    }
  }
`;

const GET_BUFFER_EVENT_HISTORY = gql`
  query GetPoolHistory($contractId: String!) {
    swaps(orderBy: timestamp_DESC, filter: { contractId: { equalTo: $contractId } }) {
      user
      tokenIn
      tokenOut
      amountIn
      amountOut
      timestamp
    }
  }
`;

export async function fetchInsuranceEvents(insuranceFundAddress: string, bufferAddress: string) {
  const client = createApolloClient();

  try {
    const { data: ifData } = await client.query({
      query: GET_INSURANCE_FUND_EVENT_HISTORY,
      variables: { contractId: insuranceFundAddress },
    });

    const { data: bufferData } = await client.query({
      query: GET_BUFFER_EVENT_HISTORY,
      variables: { contractId: bufferAddress },
    });

    return {
      insuranceFund: ifData,
      buffer: bufferData,
    };
  } catch (error) {
    console.log('Error fetching data:', error);
    throw error;
  }
}
