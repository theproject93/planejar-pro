import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div
      style={{
        fontFamily: 'system-ui',
        padding: 32,
        maxWidth: 1000,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 22 }}>Planejar Pro</div>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="#sobre">Sobre</a>
          <a href="#recursos">Recursos</a>
          <a href="#contato">Contato</a>
          <Link to="/login">Entrar</Link>
        </nav>
      </header>

      <main style={{ marginTop: 48 }}>
        <h1 style={{ fontSize: 44, margin: 0 }}>
          Organize eventos com menos planilhas e mais controle.
        </h1>
        <p style={{ fontSize: 18, color: '#444', maxWidth: 720 }}>
          Uma plataforma simples e objetiva para cerimonialistas gerenciarem
          eventos, tarefas, fornecedores e prazos.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Link
            to="/login"
            style={{
              padding: '12px 18px',
              borderRadius: 10,
              background: '#4f46e5',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Entrar / Criar conta
          </Link>
          <a
            href="#recursos"
            style={{
              padding: '12px 18px',
              borderRadius: 10,
              border: '1px solid #ddd',
              textDecoration: 'none',
              color: '#111',
            }}
          >
            Ver recursos
          </a>
        </div>

        <section id="recursos" style={{ marginTop: 56 }}>
          <h2>Recursos</h2>
          <ul>
            <li>Eventos: cadastro e visão geral.</li>
            <li>Checklist: tarefas por evento (em breve).</li>
            <li>Fornecedores: cadastro e contatos (em breve).</li>
            <li>Financeiro: básico por evento (em breve).</li>
          </ul>
        </section>

        <section id="sobre" style={{ marginTop: 40 }}>
          <h2>Sobre nós</h2>
          <p style={{ color: '#444' }}>
            O Planejar Pro nasceu para simplificar a rotina de cerimonialistas:
            menos retrabalho, mais previsibilidade.
          </p>
        </section>

        <section id="contato" style={{ marginTop: 40 }}>
          <h2>Contato</h2>
          <p style={{ color: '#444' }}>
            (Depois colocamos um formulário ou link do WhatsApp.)
          </p>
        </section>
      </main>

      <footer
        style={{
          marginTop: 64,
          paddingTop: 24,
          borderTop: '1px solid #eee',
          color: '#666',
        }}
      >
        © {new Date().getFullYear()} Planejar Pro
      </footer>
    </div>
  );
}
