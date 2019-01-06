import ResetPassword from '../components/Reset';

const Reset = props => (
  <div>
    <ResetPassword resetToken={props.query.resetToken} />
  </div>
);

export default Reset;