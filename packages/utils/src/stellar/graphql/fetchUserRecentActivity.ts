import { gql } from '@apollo/client';
import { createApolloClient } from './apolloClient';

const GET_USER_ACTIVITY = gql`
  query GetUserActivity($user: String!) {
    sent: sentActivities(
      filter: { from: { equalTo: $user } }
      orderBy: TIMESTAMP_DESC
      first: 100
    ) {
      nodes {
        id
        to
        asset
        amount
        timestamp
      }
    }

    received: receivedActivities(
      filter: { to: { equalTo: $user } }
      orderBy: TIMESTAMP_DESC
      first: 100
    ) {
      nodes {
        id
        from
        asset
        amount
        timestamp
      }
    }

    swaps: swappedActivities(
      filter: { user: { equalTo: $user } }
      orderBy: TIMESTAMP_DESC
      first: 100
    ) {
      nodes {
        id
        tokenIn
        tokenOut
        amountIn
        amountOut
        timestamp
      }
    }

    addLiquidity: addLiquidityActivities(
      filter: { user: { equalTo: $user } }
      orderBy: TIMESTAMP_DESC
      first: 100
    ) {
      nodes {
        id
        pool
        amount
        timestamp
      }
    }

    removeLiquidity: removeLiquidityActivities(
      filter: { user: { equalTo: $user } }
      orderBy: TIMESTAMP_DESC
      first: 100
    ) {
      nodes {
        id
        pool
        amount
        timestamp
      }
    }

    stake: stakeActivities(
      filter: { user: { equalTo: $user } }
      orderBy: TIMESTAMP_DESC
      first: 100
    ) {
      nodes {
        id
        asset
        amount
        timestamp
      }
    }

    unstake: unstakeActivities(
      filter: { user: { equalTo: $user } }
      orderBy: TIMESTAMP_DESC
      first: 100
    ) {
      nodes {
        id
        asset
        amount
        timestamp
      }
    }
  }
`;

export async function fetchUserRecentActivity(userAddress: string) {
  const client = createApolloClient();

  try {
    // Fetch historical events
    const { data } = await client.query({
      query: GET_USER_ACTIVITY,
      variables: { user: userAddress },
    });

    // Format them into a list
    let id = 1;
    // const history: Activity[] = [];


    // const push = (entry: Omit<Activity, 'id'>) => {
    //   history.push({ id: id++, ...entry });
    // };

    // for (const tx of data.sent.nodes) {
    //   push({
    //     type: 'Sent',
    //     timestamp: Number(tx.timestamp),
    //     address: tx.to,
    //     asset: {
    //       token: tx.asset,
    //       iconUrl: getCryptoIconUrl[tx.asset] || '',
    //       amount: Number(tx.amount),
    //     },
    //   });
    // }

    // for (const tx of data.received.nodes) {
    //   push({
    //     type: 'Received',
    //     timestamp: Number(tx.timestamp),
    //     address: tx.from,
    //     asset: {
    //       token: tx.asset,
    //       iconUrl: assetIconMap[tx.asset] || '',
    //       amount: Number(tx.amount),
    //     },
    //   });
    // }

    // for (const tx of data.swaps.nodes) {
    //   push({
    //     type: 'Swapped',
    //     timestamp: Number(tx.timestamp),
    //     sell: {
    //       token: tx.tokenIn,
    //       iconUrl: assetIconMap[tx.tokenIn] || '',
    //       amount: Number(tx.amountIn),
    //     },
    //     buy: {
    //       token: tx.tokenOut,
    //       iconUrl: assetIconMap[tx.tokenOut] || '',
    //       amount: Number(tx.amountOut),
    //     },
    //   });
    // }

    // for (const tx of data.addLiquidity.nodes) {
    //   push({
    //     type: 'Add Liquidity',
    //     timestamp: Number(tx.timestamp),
    //     lpToken: {
    //       token: tx.pool,
    //       iconUrl: assetIconMap[tx.pool] || '/assets/icons/lp.svg',
    //       amount: Number(tx.amount),
    //     },
    //   });
    // }

    // for (const tx of data.removeLiquidity.nodes) {
    //   push({
    //     type: 'Remove Liquidity',
    //     timestamp: Number(tx.timestamp),
    //     lpToken: {
    //       token: tx.pool,
    //       iconUrl: assetIconMap[tx.pool] || '/assets/icons/lp.svg',
    //       amount: Number(tx.amount),
    //     },
    //   });
    // }

    // for (const tx of data.stake.nodes) {
    //   push({
    //     type: 'Stake',
    //     timestamp: Number(tx.timestamp),
    //     asset: {
    //       token: tx.asset,
    //       iconUrl: assetIconMap[tx.asset] || '',
    //       amount: Number(tx.amount),
    //     },
    //   });
    // }

    // for (const tx of data.unstake.nodes) {
    //   push({
    //     type: 'Unstake',
    //     timestamp: Number(tx.timestamp),
    //     asset: {
    //       token: tx.asset,
    //       iconUrl: assetIconMap[tx.asset] || '',
    //       amount: Number(tx.amount),
    //     },
    //   });
    // }
    return [];
    // return history.sort((a, b) => b.timestamp - a.timestamp); // most recent first
  } catch (error) {
    console.log('Error fetching data:', error);
    throw error;
  }
}
