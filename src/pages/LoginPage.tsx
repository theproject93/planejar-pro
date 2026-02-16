import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: 32 }}>
      <h1>Login</h1>
      <p>Depois conectamos no Supabase Auth.</p>
      <Link to="/">Voltar</Link>
    </div>
  );
}
