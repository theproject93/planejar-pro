# PlanejarPro

Plataforma web para gestão e planejamento de eventos (dashboard, eventos e detalhes do evento), construída com React + TypeScript + Vite e Supabase. [cite:16][cite:24][cite:23]

## Stack
- React + React Router (rotas públicas e privadas) [cite:24]
- Supabase (Auth + banco via @supabase/supabase-js) [cite:16][cite:23]
- Tailwind (via @tailwindcss/vite) [cite:16]
- Export/relatórios e utilitários de UI (html2canvas/jspdf, framer-motion, etc.) [cite:16]

## Rotas principais
- `/` Landing [cite:24]
- `/login` Login/Cadastro [cite:24]
- `/dashboard` (rota protegida) [cite:24]
- `/dashboard/eventos` e `/dashboard/eventos/:id` [cite:24]

## Como rodar localmente
1) Instale as dependências:
   ```bash
   npm install
