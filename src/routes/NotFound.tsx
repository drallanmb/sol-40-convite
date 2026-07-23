import Shell from '../components/layout/Shell'

/**
 * NotFound — fallback de rota (qualquer caminho fora de `/` e `/admin`).
 * Sem dados, sem auth — só uma mensagem e um link de volta.
 */
function NotFound() {
  return (
    <Shell>
      <section className="mx-auto flex max-w-6xl flex-col items-start px-4 py-24 sm:px-8">
        <p className="text-caption font-bold uppercase tracking-label text-wine">404</p>
        <h1 className="mt-3 font-serif text-subheading">Página não encontrada</h1>
        <p className="mt-4 max-w-prose text-body text-ink/80">
          O endereço que você tentou acessar não existe.{' '}
          <a href="/" className="font-bold text-coral underline underline-offset-4">
            Voltar para o início
          </a>
          .
        </p>
      </section>
    </Shell>
  )
}

export default NotFound
