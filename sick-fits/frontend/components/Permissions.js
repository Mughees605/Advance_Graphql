import { Query, Mutation } from 'react-apollo';
import Error from './ErrorMessage';
import gql from 'graphql-tag';
import Table from './styles/Table';
import SickButton from './styles/SickButton';
import PropTypes from 'prop-types';

const possiblePermissions = [
  'ADMIN',
  'USER',
  'ITEMCREATE',
  'ITEMUPDATE',
  'ITEMDELETE',
  'PERMISSIONUPDATE',
];

const UPDATE_PERMISSIONS_MUTATION = gql`
 mutation updatePermissions($permissions: [Permission], $userId: ID!){
   updatePermissions(permissions: $permissions, userId: $userId){
    id
    permissions
    name
    email
   }
 }
`

const ALL_USERS_QUERY = gql`
  query {
    users {
      id
      name
      email
      permissions
    }
  }
`;

const Permissions = props => (
  <Query query={ALL_USERS_QUERY}>
    {({ data, loading, error }) => (
      <div>
        <Error error={error} />
        <div>
          {/* added check which is not in tutorials code */}
          {data.users && (
            <>
              <h2>Manage Permissions</h2>
              <Table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    {possiblePermissions.map(permission => <th key={permission}>{permission}</th>)}
                    <th>👇🏻</th>
                  </tr>
                </thead>
                <tbody>{data.users.map(user => <UserPermissions key={user.id} user={user} key={user.id} />)}</tbody>
              </Table>
            </>
          )}
        </div>
      </div>
    )}
  </Query>
);

class UserPermissions extends React.Component {
  static propTypes = {
    user: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      id: PropTypes.string,
      permission: PropTypes.array
    }).isRequired,
  }
  state = {
    permissions: this.props.user.permissions
  }
  handlePermissionChange = (e, updatedPermissionsMutation) => {
    const checkbox = e.target;
    let updatedPermissions = [...this.state.permissions];
    if (checkbox.checked) {
      updatedPermissions.push(checkbox.value)
      this.setState({
        permissions: updatedPermissions
      })
    }
    else {
      updatedPermissions = updatedPermissions.filter(permission => permission !== checkbox.value)
      this.setState({
        permissions: updatedPermissions
      }, ()=>{
        updatedPermissionsMutation();
      })
    }
  }
  render() {
    const user = this.props.user;
    return (
      <Mutation
        mutation={UPDATE_PERMISSIONS_MUTATION}
        variables={{
          permissions: this.state.permissions,
          userId: this.props.user.id
        }}
      >
        {(updatePermissions, { loading, error }) => {
          return (
            <>
              {error && <tr><td colSpan="8"><Error error={error} /></td></tr>}
              <tr>
                <td>{user.name}</td>
                <td>{user.email}</td>
                {possiblePermissions.map(permission => (
                  <td key={permission}>
                    <label htmlFor={`${user.id}-permission-${permission}`}>
                      <input
                        id={`${user.id}-permission-${permission}`}
                        type="checkbox"
                        checked={this.state.permissions.includes(permission)}
                        value={permission}
                        onChange={ (e) => this.handlePermissionChange(e, updatePermissions)}
                      />
                    </label>
                  </td>
                ))}
                <td>
                  <SickButton
                    type="button"
                    disabled={loading}
                    onClick={updatePermissions}
                  >
                    Updat{ loading ? "ing" : "e"}
                 </SickButton>
                </td>
              </tr>
            </>
          )
        }}
      </Mutation>
    );
  }
}

export default Permissions;