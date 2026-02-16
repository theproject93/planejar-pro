import { Link } from 'react-router-dom';

export function AppPage() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: 32 }}>
      <h1>App (sistema)</h1>
      <p>Aqui vai o dashboard + eventos + checklists.</p>
      <Link to="/">Ir para Landing</Link>
    </div>
  );
}
