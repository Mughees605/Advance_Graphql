import Link from 'next/link';
const Home = props => (
  <div>
     <p>Hello</p>
     <Link href="/sell">
        Sell
     </Link>
  </div>
);

export default Home;