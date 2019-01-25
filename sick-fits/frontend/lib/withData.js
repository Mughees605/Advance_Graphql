import withApollo from 'next-with-apollo';
import ApolloClient from 'apollo-boost';
import { endpoint, prodEndPoint } from '../config';
import { LOCAL_STATE_QUERY, TOGGLE_CART_MUTATION } from './../components/Cart';

function createClient({ headers }) {
  return new ApolloClient({
    uri: process.env.NODE_ENV === 'development' ? endpoint : prodEndPoint,
    request: operation => {
      operation.setContext({
        fetchOptions: {
          credentials: 'include',
        },
        headers,
      });
    },
   // local data
   clientState: {
     resolvers: {
       Mutation:{
         toggleCart(_, variables, { cache }){
           // read the cart open value from cache
           const { cartOpen }= cache.readQuery({ query: LOCAL_STATE_QUERY });
           // write the cart state to the opposit
           const data = {
              data : { cartOpen: !cartOpen },
           };
           cache.writeData(data);
           return data;
         },
       },
     },
     defaults:{
       cartOpen: false,
     }
   }
  });
}

export default withApollo(createClient);
