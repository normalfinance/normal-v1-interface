import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { constants } from '../..';

export function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === 'undefined',
    link: new HttpLink({
      uri: constants.NORMAL_HISTORY_INDEXER, // Replace with your GraphQL server URL
      fetch,
    }),
    cache: new InMemoryCache(),
  });
}
