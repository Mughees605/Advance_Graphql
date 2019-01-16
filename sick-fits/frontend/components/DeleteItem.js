import React, { Component } from 'react';
import { Mutation } from 'react-apollo';
import { ALL_ITEMS_QUERY } from './Items';
import gql from 'graphql-tag';

const DELETE_ITEM_MUTATION = gql`
mutation DELETE_ITEM_MUTATION($id: ID!){
   deleteItem(id: $id){
     id
   }
}
`
class DeleteItem extends Component {
  update = (cache, payload) => {
    // first we have to read the data in cache
    let data = cache.readQuery({ query: ALL_ITEMS_QUERY });
    // filter the items which is deleted
    data.items = data.items.filter(item => item.id !== payload.data.deleteItem.id);
    // update the cache with filtered list
    cache.writeQuery({ query: ALL_ITEMS_QUERY, data })
  }
  render() {
    return (
      <Mutation
        mutation={DELETE_ITEM_MUTATION}
        variables={{ id: this.props.id }}
        update={this.update}
      >
        {(deleteItem, { error }) => {
          return (
            <button onClick={() => {
              if (confirm("Are you sure you want to delete this item")) {
                deleteItem().catch( err => {
                  alert(err.message);
                });
              }
            }}>
              {this.props.children}
            </button>
          )
        }}
      </Mutation>

    );
  }
}

export default DeleteItem;