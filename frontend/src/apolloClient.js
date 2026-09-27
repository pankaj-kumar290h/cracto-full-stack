import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
// Note: Apollo Client v4 splits React hooks/provider into "@apollo/client/react".

export const client = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4000/graphql",
  }),
  cache: new InMemoryCache(),
});
