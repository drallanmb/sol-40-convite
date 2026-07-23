import { useState } from 'react'
import Shell from '../components/layout/Shell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Field from '../components/ui/Field'
import Toast from '../components/ui/Toast'

const swatches = [
  { name: 'cream', className: 'bg-cream text-ink' },
  { name: 'sand', className: 'bg-sand text-ink' },
  { name: 'peach', className: 'bg-peach text-ink' },
  { name: 'coral', className: 'bg-coral text-cream' },
  { name: 'orange', className: 'bg-orange text-cream' },
  { name: 'plum', className: 'bg-plum text-cream' },
  { name: 'wine', className: 'bg-wine text-cream' },
  { name: 'ink', className: 'bg-ink text-cream' },
  { name: 'sea', className: 'bg-sea text-cream' },
]

/**
 * Home — andaime de verificação visual do design system (Phase 1, DESIGN-01/
 * DESIGN-02). Não é a página final do convite (essa é a Phase 2+); aqui só
 * confirmamos que a paleta, as fontes e os primitivos renderizam com a
 * identidade "pôr do sol".
 */
function Home() {
  const [showToast, setShowToast] = useState(false)

  return (
    <Shell>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
        <p className="text-caption font-bold uppercase tracking-label text-wine">Design system preview</p>
        <h1 className="mt-3 font-serif text-heading leading-[0.95] tracking-display">
          Sol <em className="not-italic text-coral">faz 40</em>
        </h1>
        <p className="mt-4 max-w-prose text-body text-ink/80">
          Andaime de verificação visual — não é uma página final. Confirma paleta, fontes e primitivos.
        </p>

        <h2 className="mt-12 font-serif text-subheading">Paleta pôr do sol</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {swatches.map((swatch) => (
            <div
              key={swatch.name}
              className={`flex h-20 flex-col items-center justify-center gap-1 border border-line text-caption uppercase tracking-label ${swatch.className}`}
            >
              {swatch.name}
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-serif text-subheading">Botões</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button variant="primary">Confirmar presença</Button>
          <Button variant="quiet">Ver programa</Button>
          <Button variant="primary" disabled aria-busy={true}>
            Enviando…
          </Button>
        </div>

        <h2 className="mt-12 font-serif text-subheading">Campo + Card</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <Card>
            <Field id="preview-nome" label="Nome" hint="Como você quer aparecer no convite" placeholder="Soraya" />
            <Field id="preview-recado" label="Recado" multiline placeholder="Deixe um recado para os aniversariantes" />
          </Card>
          <Card>
            <h3 className="font-serif text-lead">Card de exemplo</h3>
            <p className="mt-2 text-body text-ink/80">
              Superfície cream com sombra offset — mesma base visual usada em cards de vinho e no mural de
              memórias.
            </p>
          </Card>
        </div>

        <h2 className="mt-12 font-serif text-subheading">Toast</h2>
        <div className="mt-4">
          <Button variant="quiet" onClick={() => setShowToast(true)}>
            Disparar toast
          </Button>
        </div>
      </section>

      {showToast ? <Toast>Presença confirmada! Obrigado ✨</Toast> : null}
    </Shell>
  )
}

export default Home
