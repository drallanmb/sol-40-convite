import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'

// Cliente reativo do Convex, conectado ao deployment via VITE_CONVEX_URL.
// A URL é pública por design (o cliente WebSocket precisa dela) — nenhum
// segredo é exposto aqui. Ver .env.example.
//
// NOTA: nesta fase (Fase 1), monta-se apenas ConvexProvider — nenhum
// provider de autenticação é adicionado aqui. A auth do dono é escopo
// da Phase 6; /admin é só um placeholder de rota até lá.
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexProvider>
  </StrictMode>,
)
