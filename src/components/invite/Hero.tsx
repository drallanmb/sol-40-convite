import { Link } from 'react-router'
import { HERO, SECTION_IDS } from '../../content/event'
import { buttonClassName } from '../ui/Button'
import { SeaWaves } from './SeaWaves'

/**
 * Hero do convite — céu/sol/horizonte em gradiente pôr do sol, mar animado
 * passando à frente do disco solar, caminho de luz dourada e as quatro
 * camadas de texto (eyebrow, lockup Sol/40 anos, tagline, meta de canto)
 * mais as ações do RSVP/programa (D-06/D-08). Gradientes e keyframes não
 * são achatáveis em utilitária pura.
 *
 * O foco programático (tabIndex negativo) permite que o skip link (plan
 * 02-07) mova o foco para cá. Todo texto vem de `HERO`; nenhuma string é
 * hardcoded neste componente. A ação primária usa navegação do Router para
 * `/confirmar`; a secundária continua sendo o fragmento da programação.
 */
export function Hero() {
  return (
    <section
      id={SECTION_IDS.hero}
      tabIndex={-1}
      className="relative grid min-h-[860px] h-screen place-items-center overflow-hidden bg-peach text-cream"
    >
      {/* céu — gradiente radial (halo do sol) + gradiente linear de 5 paradas,
          com o sol e o horizonte desenhados por dentro dele */}
      <div
        className="hero-sky-enter absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 61%, var(--color-sky-halo), transparent 21%), linear-gradient(180deg, var(--color-sky-dusk) 0%, var(--color-sky-apricot) 52%, var(--color-sky-coral) 100%)',
        }}
      >
        {/* textura sutil, igual ao ::after do hero-sky antigo */}
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-soft-light"
          style={{
            backgroundImage:
              'repeating-radial-gradient(circle at 18% 32%, var(--color-sky-grain) 0 1px, transparent 1px 4px)',
          }}
        />

        {/* sol */}
        <div
          className="hero-sun-enter absolute left-1/2 top-[62%] aspect-square w-[clamp(260px,28vw,480px)] rounded-full sm:top-[59%]"
          style={{
            background: 'var(--color-sun)',
            boxShadow: '0 0 100px var(--color-sun-halo)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      <SeaWaves />

      {/* camada de texto */}
      <div className="relative z-[3] mx-auto flex max-w-3xl flex-col items-center px-4 text-center text-plum sm:px-8">
        <p className="hero-enter hero-enter--eyebrow text-small font-bold uppercase tracking-label">
          {HERO.eyebrow}
        </p>

        <h1 className="hero-enter hero-enter--title mt-[22px] leading-[0.86] text-shadow-[0_5px_45px_var(--color-display-shadow)]">
          <span className="block font-serif text-display tracking-display">{HERO.title}</span>
          <span className="block font-serif text-[clamp(2.25rem,4.8vw,4rem)] italic tracking-display">
            {HERO.titleSub}
          </span>
        </h1>

        <p className="hero-enter hero-enter--tagline mt-[22px] font-serif text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.3]">
          {HERO.taglineLead}
          <em className="not-italic text-coral">{HERO.taglineEm}</em>
        </p>

        <div className="hero-enter hero-enter--actions mt-11 flex w-full max-w-sm flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row sm:gap-6">
          <Link
            to={HERO.primaryCtaHref}
            className={buttonClassName('rsvp', 'w-full sm:w-auto')}
          >
            {HERO.primaryCtaLabel}
          </Link>
          <a
            href={HERO.secondaryCtaHref}
            className={buttonClassName('heroSecondary', 'w-full sm:w-auto')}
          >
            {HERO.secondaryCtaLabel}
          </a>
        </div>
      </div>

      {/* meta de canto — inferior esquerda/direita */}
      <div className="hero-enter hero-enter--meta absolute inset-x-[clamp(22px,5vw,78px)] bottom-7 z-[4] flex justify-between text-caption uppercase tracking-label text-cream">
        <span>{HERO.metaLeft}</span>
        <span>{HERO.metaRight}</span>
      </div>
    </section>
  )
}

export default Hero
