import {
  Component,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  createStableVisitOrder,
  orderForVisit,
  type StableVisitOrder,
} from '../../lib/stableVisitOrder'
import Button from '../ui/Button'
import MemoryCarousel from './MemoryCarousel'
import MemoryForm from './MemoryForm'

type AlbumErrorBoundaryProps = {
  children: ReactNode
}

type AlbumErrorBoundaryState = {
  failed: boolean
  revision: number
}

class AlbumErrorBoundary extends Component<
  AlbumErrorBoundaryProps,
  AlbumErrorBoundaryState
> {
  state: AlbumErrorBoundaryState = { failed: false, revision: 0 }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The public copy intentionally avoids echoing backend error details.
  }

  retry = () => {
    this.setState(({ revision }) => ({
      failed: false,
      revision: revision + 1,
    }))
  }

  render() {
    if (this.state.failed) {
      return (
        <AlbumNotice
          title="O álbum não abriu agora."
          body="Você ainda pode enviar sua memória. Tente carregar as lembranças novamente quando quiser."
          action={
            <Button variant="quiet" onClick={this.retry}>
              Tentar carregar o álbum
            </Button>
          }
        />
      )
    }

    return (
      <div key={this.state.revision}>
        {this.props.children}
      </div>
    )
  }
}

type AlbumNoticeProps = {
  title: string
  body: string
  action?: ReactNode
}

function AlbumNotice({ title, body, action }: AlbumNoticeProps) {
  return (
    <div className="grid min-h-[14rem] place-items-center border border-line bg-card p-7 text-center">
      <div className="grid max-w-[34rem] justify-items-center gap-4">
        <p className="font-serif text-subheading text-plum">{title}</p>
        <p className="text-body text-ink/80">{body}</p>
        {action}
      </div>
    </div>
  )
}

function ApprovedAlbum() {
  const approved = useQuery(api.posts.listApproved)
  const visitOrderRef = useRef<StableVisitOrder | null>(null)
  if (visitOrderRef.current === null) {
    visitOrderRef.current = createStableVisitOrder()
  }

  if (approved === undefined) {
    return (
      <div role="status" aria-live="polite">
        <AlbumNotice
          title="Abrindo o álbum…"
          body="As lembranças aprovadas estão chegando."
        />
      </div>
    )
  }

  if (approved.length === 0) {
    return (
      <AlbumNotice
        title="O álbum está esperando a primeira lembrança."
        body="Envie uma foto, um recado ou os dois. A memória aparece aqui depois da aprovação."
      />
    )
  }

  const ordered = orderForVisit(visitOrderRef.current, approved)
  return <MemoryCarousel memories={ordered} />
}

export function MemoriesSection() {
  return (
    <section className="bg-peach/20 px-[clamp(24px,7vw,110px)] py-[clamp(80px,10vw,160px)] text-ink">
      <div className="mx-auto grid max-w-[1320px] gap-[clamp(48px,7vw,96px)]">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-caption font-bold uppercase tracking-label text-wine">
            Nosso álbum
          </p>
          <h2 className="mt-3 font-serif text-heading leading-[1.02] tracking-display text-plum">
            Memórias para guardar este pôr do sol.
          </h2>
          <p className="mt-5 text-body text-ink/80">
            Relembre os carinhos que já passaram por aqui e deixe também o
            seu. Toda memória é vista com cuidado antes de entrar no álbum.
          </p>
        </div>

        <AlbumErrorBoundary>
          <ApprovedAlbum />
        </AlbumErrorBoundary>

        <div className="mx-auto w-full max-w-[760px]">
          <MemoryForm />
        </div>
      </div>
    </section>
  )
}

export default MemoriesSection
