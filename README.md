# PlanejarPro

Plataforma web para planejamento e gestão de eventos (voltada para cerimonial/organização), com login, dashboard e gestão de eventos/detalhes. [cite:24][cite:23]

## Objetivo
Centralizar tarefas, convidados, mesas, orçamento e informações do evento em um só lugar, com uma experiência simples (dashboard → evento → abas de detalhes). [cite:24][cite:27]

## Stack
- React + TypeScript + Vite [cite:16]
- React Router (rotas públicas e protegidas) [cite:24]
- Supabase (Auth + banco) [cite:16][cite:23]
- Tailwind (via @tailwindcss/vite) [cite:16]

## Rotas
- `/` Landing [cite:24]
- `/login` Login/Cadastro [cite:24]
- `/dashboard` (protegida) [cite:24]
- `/dashboard/eventos` lista de eventos [cite:24]
- `/dashboard/eventos/:id` detalhes do evento [cite:24]

## Features (status)
### Já existe
- Landing page [cite:24]
- Login/cadastro e sessão (AuthContext + rota protegida) [cite:24]
- Dashboard com visão geral (contagem de eventos, próximo evento, orçamento agregado) [cite:24]
- CRUD/gestão de eventos + tela de detalhes do evento [cite:24]
- Abas no detalhe do evento (ex.: tarefas, orçamento, convidados, mesas, mapa visual etc.) [cite:27]

### Em progresso / melhoria
- Padronização de schema (snake_case) e tipagem consistente entre front e Supabase. [cite:23]
- Melhorar “estado vazio”, loading e feedback de erro por aba. [cite:27]

## Como rodar localmente
1) `npm install`
2) Copie `.env.example` → `.env` e preencha: [cite:23]
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3) `npm run dev` [cite:16]

## Scripts
- `npm run dev` [cite:16]
- `npm run build` [cite:16]
- `npm run preview` [cite:16]
- `npm run lint` [cite:16]

## Deploy (SPA)
Há um `public/_redirects` para suporte a rotas SPA em hosts como Netlify. [cite:20]
