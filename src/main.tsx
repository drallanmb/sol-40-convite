import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'

// Cliente reativo do Convex, conectado ao deployment via VITE_CONVEX_URL.
// A URL é pública por design (o cliente WebSocket precisa dela) — nenhum
// segredo é exposto aqui. Ver .env.example.
// A autenticação administrativa usa sessões próprias validadas nas functions
// Convex e é montada dentro das rotas /admin; não depende de um provider
// global de identidade no ponto de entrada da aplicação.
const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error(
    'VITE_CONVEX_URL não definida — configure o .env (ver .env.example) antes de rodar/deployar.',
  )
}
const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexProvider>
  </StrictMode>,
)
