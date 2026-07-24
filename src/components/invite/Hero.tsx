import { HERO, SECTION_IDS } from '../../content/event'
import { PalmSvg } from './PalmSvg'
import { SeaWaves } from './SeaWaves'

/**
 * Hero do convite — céu/sol/horizonte em gradiente pôr do sol, duas
 * palmeiras em SVG, mar animado com caminho de luz dourada e as quatro
 * camadas de texto (eyebrow, lockup Sol/40 anos, tagline, meta de canto)
 * mais o CTA "Ver programação ↓" (D-06/D-07/D-08). Gradientes e keyframes
 * são portados 1:1 do `.hero`/`.hero-sky`/`.hero-sun`/`.hero-horizon` do
 * `globals.css` antigo — não achatáveis em utilitária pura.
 *
 * O foco programático (tabIndex negativo) permite que o skip link (plan
 * 02-07) mova o foco para cá. Todo texto vem de `HERO`; nenhuma string é
 * hardcoded neste componente. Um único CTA aparece nesta fase — o link de
 * RSVP não tem destino até a Phase 3 e não deve aparecer aqui em nenhuma
 * forma.
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
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 57%, rgba(255,220,144,.8), transparent 21%), linear-gradient(180deg, #cf755f 0%, #ed895e 44%, #ed684a 68%, #4b2937 69%, #1a3940 100%)',
        }}
      >
        {/* textura sutil, igual ao ::after do hero-sky antigo */}
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-soft-light"
          style={{
            backgroundImage:
              'repeating-radial-gradient(circle at 18% 32%, rgba(255,255,255,.32) 0 1px, transparent 1px 4px)',
          }}
        />

        {/* sol */}
        <div
          className="absolute left-1/2 top-[54%] aspect-square w-[clamp(260px,28vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: '#ffb55d', boxShadow: '0 0 100px rgba(255,173,77,.62)' }}
        />

        {/* horizonte — duas bandas de gradiente linear empilhadas */}
        <div
          className="absolute inset-x-0 top-[69%] bottom-0"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(255,126,78,.28), transparent 25%), linear-gradient(176deg, transparent 0 58%, rgba(255,243,223,.08) 59%, transparent 60%)',
          }}
        />
      </div>

      <SeaWaves />
      <PalmSvg side="left" />
      <PalmSvg side="right" />

      {/* camada de texto */}
      <div className="relative z-[3] mx-auto flex max-w-3xl flex-col items-center px-4 text-center text-plum sm:px-8">
        <p className="text-small font-bold uppercase tracking-label">{HERO.eyebrow}</p>

        <h1 className="mt-[22px] leading-[0.86] text-shadow-[0_5px_45px_rgba(53,25,42,0.15)]">
          <span className="block font-serif text-display tracking-display">{HERO.title}</span>
          <span className="block font-serif text-[clamp(2.25rem,4.8vw,4rem)] italic tracking-display">
            {HERO.titleSub}
          </span>
        </h1>

        <p className="mt-[22px] font-serif text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.3]">
          {HERO.taglineLead}
          <em className="not-italic text-coral">{HERO.taglineEm}</em>
        </p>

        <a href={HERO.ctaHref} className="mt-11 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[100px] border border-plum bg-transparent px-6 py-4 font-sans text-small font-bold uppercase tracking-label text-plum transition-[transform,background-color,border-color,color] duration-(--duration-fast) ease-out hover:bg-plum/5 active:scale-[0.98]">
          {HERO.ctaLabel}
        </a>
      </div>

      {/* meta de canto — inferior esquerda/direita */}
      <div className="absolute inset-x-[clamp(22px,5vw,78px)] bottom-7 z-[4] flex justify-between text-caption uppercase tracking-label text-cream">
        <span>{HERO.metaLeft}</span>
        <span>{HERO.metaRight}</span>
      </div>
    </section>
  )
}

export default Hero
