import { defineSchema } from 'convex/server'

// Fundação do backend Convex (Fase 1 / plano 01-01).
//
// As tabelas do modelo de dados (rsvps, rsvpGuests, wines, posts, settings)
// entram nas fases seguintes conforme a "Ordem de Build" documentada em
// .planning/research/ARCHITECTURE.md:
//   - Fase 3: rsvps / rsvpGuests (RSVP público)
//   - Fase 4: wines (carta de vinhos)
//   - Fase 5: posts (mural com upload + moderação)
//   - Fase 6: settings + auth do dono (requireOwner)
//
// Mantido vazio de propósito aqui — este stub só estabelece a fundação
// (defineSchema aplicado no deploy do Convex) para o cliente conectar.
export default defineSchema({})
