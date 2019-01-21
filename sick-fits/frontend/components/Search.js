import React from 'react';
import Router from 'next/router';
import Downshift, { resetIdCounter } from 'downshift';
import { ApolloConsumer } from 'react-apollo';
import gql from 'graphql-tag';
import debounce from 'lodash.debounce';
import { DropDown, DropDownItem, SearchStyles } from './styles/DropDown';

const SEARCH_ITEM_QUERY = gql`
  query SEARCH_ITEMS_QUERY($searchTerm: String!){
    items(where:{
        OR:[
            { title_contains: $searchTerm},
            { description_contains: $searchTerm}
        ],
    }){
        id
        image
        title
    }
  }
`

function routeToItem(item){
  Router.push({
      pathname: '/item',
      query: {
          id: item.id,
      },
  })
}
class AutoComplete extends React.Component {

    state = {
        items: [],
        loading: false
    }

    onChange = debounce(async (e, client) => {

        this.setState({ loading: true });

        const res = await client.query({
            query: SEARCH_ITEM_QUERY,
            variables: { searchTerm: e.target.value },
        })

        this.setState({
            items: res.data.items,
            loading: false
        })
    }, 350);

    render() {
        resetIdCounter()
        return (
            <SearchStyles>
                <Downshift onChange={routeToItem} itemToString={ item => ( item == null ? '' : item.title )}>
                    {({ getInputProps, getItemProps, isOpen, inputValue, highlightedIndex }) => {
                        return (
                            <div>
                                <ApolloConsumer>
                                    {(client) => (
                                        <input
                                            type="search"
                                            {...getInputProps({
                                                type: 'search',
                                                placeholder: 'search for an item',
                                                className: this.state.loading ? 'loading' : '',
                                                onChange: e => {
                                                    e.persist();
                                                    this.onChange(e, client)
                                                }
                                            })}
                                        />
                                    )}
                                </ApolloConsumer>
                                {isOpen && (
                                    <DropDown>
                                        {this.state.items.map((item, index) => {
                                            return (
                                                <DropDownItem
                                                    {...getItemProps({ item })}
                                                    key={item.id}
                                                    highlighted={index === highlightedIndex}
                                                    >
                                                    <img width="50" src={item.image} alt={item.title} />
                                                    {item.title}
                                                </DropDownItem>
                                            )
                                        })}
                                        {!this.state.items.length && !this.state.loading && (
                                            <DropDownItem> Nothing Found {inputValue}</DropDownItem>
                                        )}
                                    </DropDown>
                                )}
                            </div>
                        )
                    }}
                </Downshift>
            </SearchStyles>
        )
    }
}

export default AutoComplete;