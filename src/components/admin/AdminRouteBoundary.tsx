import { Component, type ErrorInfo, type ReactNode } from 'react'

type AdminRouteBoundaryProps = {
  children: ReactNode
}

type AdminRouteBoundaryState = {
  unavailable: boolean
}

export class AdminRouteBoundary extends Component<
  AdminRouteBoundaryProps,
  AdminRouteBoundaryState
> {
  state: AdminRouteBoundaryState = { unavailable: false }

  static getDerivedStateFromError(): AdminRouteBoundaryState {
    return { unavailable: true }
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // Convex already reports runtime failures. Do not reflect or duplicate
    // technical details here because they may include deployment metadata.
  }

  render() {
    if (!this.state.unavailable) return this.props.children

    return (
      <main className="admin-dashboard grid min-h-screen place-items-center bg-cream px-4 py-12 text-ink">
        <section
          aria-labelledby="admin-unavailable-title"
          className="w-full max-w-[480px] rounded-lg border border-line bg-card p-6 text-center sm:p-8"
        >
          <p className="font-serif text-xl font-bold text-plum">Sol 40</p>
          <h1
            id="admin-unavailable-title"
            className="mt-5 font-serif text-admin-title font-bold leading-none text-plum"
          >
            Painel temporariamente indisponível
          </h1>
          <p className="mt-4 leading-normal">
            Não foi possível abrir o acesso administrativo com segurança.
            Atualize a página depois que o serviço estiver disponível.
          </p>
          <button
            type="button"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-plum px-5 py-3 font-bold text-cream outline-none focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-3"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="mx-auto mt-3 flex min-h-11 w-fit items-center justify-center px-4 font-bold text-plum underline decoration-coral decoration-2 underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-3"
          >
            Voltar ao convite
          </a>
        </section>
      </main>
    )
  }
}

export default AdminRouteBoundary
