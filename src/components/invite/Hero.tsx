import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { HERO, SECTION_IDS } from '../../content/event'
import {
  CINEMATIC_INTRO_DURATION_MS,
  type IntroCompletionReason,
  type IntroState,
} from '../../lib/cinematicIntro'
import { buttonClassName } from '../ui/Button'
import { SeaWaves } from './SeaWaves'

export type HeroProps = {
  introState: IntroState
  introRunGeneration: number
  onIntroComplete: (reason: IntroCompletionReason) => void
}

const PRIMARY_COPY_ONSET = 0.76
const SECONDARY_COPY_ONSET = 0.88

type PalmSilhouetteProps = {
  side: 'left' | 'right'
}

function PalmSilhouette({ side }: PalmSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 120 260"
      preserveAspectRatio="xMidYMax meet"
      className={`cinematic-palm cinematic-palm--${side}`}
      aria-hidden="true"
    >
      <path
        d="M58 260 C56 205 57 145 68 75 C70 62 73 52 77 41 L86 44 C79 66 75 94 73 126 C70 176 72 222 78 260 Z"
        fill="currentColor"
      />
      <g className="cinematic-palm__crown" fill="currentColor">
        <path d="M82 47 C60 31 35 25 7 31 C34 34 57 43 80 52 Z" />
        <path d="M82 46 C62 21 43 10 18 9 C41 18 60 32 82 51 Z" />
        <path d="M83 45 C79 19 69 4 52 1 C66 15 76 31 83 51 Z" />
        <path d="M85 45 C93 21 107 8 120 6 C109 21 98 35 86 51 Z" />
        <path d="M86 47 C102 31 113 26 120 27 L120 36 C106 37 96 43 86 53 Z" />
        <path d="M85 49 C103 49 115 58 120 70 C106 62 95 58 84 55 Z" />
        <path d="M82 49 C65 60 54 74 49 91 C63 76 73 66 84 55 Z" />
      </g>
    </svg>
  )
}

/**
 * O hero é o próprio plano-sequência: todas as camadas existem do primeiro
 * ao último frame, e o único disco solar termina naturalmente no seu wrapper
 * responsivo real. A WAAPI só aplica efeitos transitórios; o CSS base é sempre
 * o enquadramento final e, por isso, qualquer falha pode concluir em aberto.
 */
export function Hero({
  introState,
  introRunGeneration,
  onIntroComplete,
}: HeroProps) {
  const heroRef = useRef<HTMLElement>(null)
  const primaryCopyRef = useRef<HTMLDivElement>(null)
  const secondaryCopyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (introState !== 'playing') return

    const root = heroRef.current
    const primaryCopy = primaryCopyRef.current
    const secondaryCopy = secondaryCopyRef.current
    if (!root || !primaryCopy || !secondaryCopy) {
      onIntroComplete('error')
      return
    }

    let completed = false
    let disposed = false
    let interactionFrame = 0
    const animations: Animation[] = []
    let masterAnimation: Animation | null = null

    const setCopyAvailability = (progress: number) => {
      if (progress >= PRIMARY_COPY_ONSET) {
        primaryCopy.removeAttribute('inert')
      } else {
        primaryCopy.setAttribute('inert', '')
      }

      if (progress >= SECONDARY_COPY_ONSET) {
        secondaryCopy.removeAttribute('inert')
      } else {
        secondaryCopy.setAttribute('inert', '')
      }
    }

    const cancelAnimationsSafely = () => {
      for (const animation of animations) {
        try {
          animation.onfinish = null
          animation.cancel()
        } catch {
          // The DOM has already been promoted to the authoritative final state.
        }
      }
    }

    const commitFinal = (reason: IntroCompletionReason) => {
      if (completed || disposed) return
      completed = true
      root.dataset.introState = 'complete'
      primaryCopy.removeAttribute('inert')
      secondaryCopy.removeAttribute('inert')
      if (interactionFrame) window.cancelAnimationFrame(interactionFrame)
      cancelAnimationsSafely()
      onIntroComplete(reason)
    }

    try {
      const target = root.querySelector<HTMLElement>(
        '[data-intro-sun-target]',
      )
      if (!target || typeof target.animate !== 'function') {
        throw new Error('Cinematic intro target is unavailable')
      }

      const stageRect = root.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      if (
        !Number.isFinite(stageRect.width) ||
        !Number.isFinite(stageRect.height) ||
        !Number.isFinite(targetRect.width) ||
        stageRect.width <= 0 ||
        stageRect.height <= 0 ||
        targetRect.width <= 0
      ) {
        throw new Error('Cinematic intro geometry is invalid')
      }

      const mobile = stageRect.width < 640
      const startX = stageRect.width * (mobile ? 0.2 : -0.31)
      const startY = stageRect.height * (mobile ? -0.39 : -0.41)
      const bendX = stageRect.width * (mobile ? 0.13 : -0.2)
      const bendY = stageRect.height * (mobile ? -0.27 : -0.28)
      const approachX = stageRect.width * (mobile ? 0.045 : -0.065)
      const approachY = stageRect.height * (mobile ? -0.095 : -0.085)

      const definitions: Array<{
        track: string
        keyframes: Keyframe[]
      }> = [
        {
          track: 'camera',
          keyframes: [
            {
              offset: 0,
              transform: mobile
                ? 'translate3d(0, 1.8%, 0) scale(1.038)'
                : 'translate3d(0, 2.4%, 0) scale(1.052)',
            },
            {
              offset: 0.68,
              transform: 'translate3d(0, .5%, 0) scale(1.012)',
              easing: 'cubic-bezier(.22,.72,.2,1)',
            },
            { offset: 1, transform: 'none' },
          ],
        },
        {
          track: 'cool-veil',
          keyframes: [
            { offset: 0, opacity: 0.72 },
            { offset: 0.54, opacity: 0.28 },
            { offset: 1, opacity: 0 },
          ],
        },
        {
          track: 'warm-horizon',
          keyframes: [
            { offset: 0, opacity: 0.28, transform: 'scale3d(.72, .72, 1)' },
            { offset: 0.68, opacity: 0.78, transform: 'scale3d(.94, .9, 1)' },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'cloud-far',
          keyframes: [
            {
              offset: 0,
              opacity: 0.58,
              transform: mobile
                ? 'translate3d(-3%, 2%, 0) scale(1.03)'
                : 'translate3d(2.5%, 2%, 0) scale(1.04)',
            },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'cloud-near',
          keyframes: [
            {
              offset: 0,
              opacity: 0.42,
              transform: mobile
                ? 'translate3d(7%, 4%, 0) scale(1.06)'
                : 'translate3d(-7%, 4%, 0) scale(1.08)',
            },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'sun-arc',
          keyframes: [
            {
              offset: 0,
              transform: `translate3d(${startX}px, ${startY}px, 0) scale(.84)`,
              easing: 'cubic-bezier(.3,.02,.62,.72)',
            },
            {
              offset: 0.4,
              transform: `translate3d(${bendX}px, ${bendY}px, 0) scale(.91)`,
              easing: 'cubic-bezier(.38,.12,.38,1)',
            },
            {
              offset: 0.7,
              transform: `translate3d(${approachX}px, ${approachY}px, 0) scale(.975)`,
              easing: 'cubic-bezier(.16,.76,.16,1)',
            },
            { offset: 1, transform: 'none' },
          ],
        },
        {
          track: 'haze',
          keyframes: [
            { offset: 0, opacity: 0.2, transform: 'scale3d(.72, .62, 1)' },
            { offset: 0.7, opacity: 0.72, transform: 'scale3d(.94, .9, 1)' },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'reflection',
          keyframes: [
            { offset: 0, opacity: 0.04, transform: 'scale3d(.34, .16, 1)' },
            { offset: 0.4, opacity: 0.12, transform: 'scale3d(.46, .26, 1)' },
            { offset: 0.7, opacity: 0.56, transform: 'scale3d(.78, .68, 1)' },
            { offset: 0.88, opacity: 0.9, transform: 'scale3d(.96, .94, 1)' },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'wave-light',
          keyframes: [
            { offset: 0, opacity: 0.08, transform: 'translate3d(0, 6px, 0)' },
            { offset: 0.7, opacity: 0.58, transform: 'translate3d(0, 2px, 0)' },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'palm-left',
          keyframes: [
            {
              offset: 0,
              opacity: mobile ? 0.62 : 0.3,
              transform: 'translate3d(-2.5%, 1.5%, 0) scale(1.025)',
            },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'palm-right',
          keyframes: [
            {
              offset: 0,
              opacity: mobile ? 0.58 : 0.26,
              transform: 'translate3d(2.5%, 2%, 0) scale(1.03)',
            },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'copy-primary',
          keyframes: [
            { offset: 0, opacity: 0, transform: 'translate3d(0, 12px, 0)' },
            { offset: 0.75, opacity: 0, transform: 'translate3d(0, 12px, 0)' },
            {
              offset: PRIMARY_COPY_ONSET,
              opacity: 0.08,
              transform: 'translate3d(0, 10px, 0)',
            },
            { offset: 0.9, opacity: 1, transform: 'none' },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
        {
          track: 'copy-secondary',
          keyframes: [
            { offset: 0, opacity: 0, transform: 'translate3d(0, 10px, 0)' },
            { offset: 0.87, opacity: 0, transform: 'translate3d(0, 10px, 0)' },
            {
              offset: SECONDARY_COPY_ONSET,
              opacity: 0.08,
              transform: 'translate3d(0, 8px, 0)',
            },
            { offset: 1, opacity: 1, transform: 'none' },
          ],
        },
      ]

      for (const definition of definitions) {
        const owner = root.querySelector<HTMLElement>(
          `[data-intro-track="${definition.track}"]`,
        )
        if (!owner) {
          throw new Error(`Missing cinematic track: ${definition.track}`)
        }

        const animation = owner.animate(definition.keyframes, {
          duration: CINEMATIC_INTRO_DURATION_MS,
          easing: 'linear',
          fill: 'both',
          iterations: 1,
        })
        animations.push(animation)
        if (definition.track === 'sun-arc') masterAnimation = animation
      }

      if (!masterAnimation) {
        throw new Error('Cinematic intro master animation is unavailable')
      }

      setCopyAvailability(0)
      masterAnimation.onfinish = () => commitFinal('finished')

      const updateInteraction = () => {
        if (disposed || completed || !masterAnimation) return
        try {
          const currentTime = Number(masterAnimation.currentTime ?? 0)
          const progress = Math.min(
            1,
            Math.max(0, currentTime / CINEMATIC_INTRO_DURATION_MS),
          )
          setCopyAvailability(progress)
          interactionFrame = window.requestAnimationFrame(updateInteraction)
        } catch {
          commitFinal('error')
        }
      }
      interactionFrame = window.requestAnimationFrame(updateInteraction)
    } catch {
      commitFinal('error')
    }

    return () => {
      disposed = true
      if (interactionFrame) window.cancelAnimationFrame(interactionFrame)
      cancelAnimationsSafely()
    }
  }, [
    introState,
    introRunGeneration,
    onIntroComplete,
  ])

  const copyIsWaiting = introState === 'playing'

  return (
    <section
      ref={heroRef}
      id={SECTION_IDS.hero}
      tabIndex={-1}
      data-intro-state={introState}
      className="cinematic-hero relative grid h-[100dvh] min-h-[100dvh] place-items-center overflow-hidden bg-peach text-cream"
    >
      <div
        data-intro-scene
        aria-hidden="true"
        className="cinematic-scene pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          data-intro-layer="camera"
          data-intro-track="camera"
          className="cinematic-camera absolute inset-0"
        >
          <div
            data-intro-layer="sky-base"
            className="cinematic-sky-base absolute inset-0"
          />
          <div
            data-intro-layer="cool-veil"
            data-intro-track="cool-veil"
            className="cinematic-cool-veil absolute inset-0"
          />
          <div
            data-intro-layer="warm-horizon"
            data-intro-track="warm-horizon"
            className="cinematic-warm-horizon absolute inset-x-0"
          />

          <div
            data-intro-layer="cloud-far"
            data-intro-track="cloud-far"
            className="cinematic-cloud cinematic-cloud--far absolute"
          />
          <div
            data-intro-layer="cloud-near"
            data-intro-track="cloud-near"
            className="cinematic-cloud cinematic-cloud--near absolute"
          />

          <div
            data-intro-sun-target
            className="cinematic-sun-target absolute"
          >
            <div className="cinematic-sun-retarget h-full w-full">
              <div
                data-intro-sun
                data-intro-track="sun-arc"
                className="cinematic-sun h-full w-full rounded-full"
              />
            </div>
          </div>

          <div
            data-intro-layer="haze-horizon"
            data-intro-track="haze"
            className="cinematic-haze absolute inset-x-0"
          />
          <div
            data-intro-layer="horizon-depth"
            className="cinematic-horizon-depth absolute inset-x-0"
          />
          <div
            data-intro-layer="reflection"
            data-intro-track="reflection"
            className="cinematic-reflection absolute"
          />

          <div
            data-intro-layer="sea"
            className="absolute inset-0"
          >
            <SeaWaves />
          </div>
          <div
            data-intro-layer="wave-light"
            data-intro-track="wave-light"
            className="cinematic-wave-light absolute"
          />

          <div
            data-intro-layer="palm-left"
            data-intro-track="palm-left"
            className="cinematic-palm-wrap cinematic-palm-wrap--left absolute"
          >
            <PalmSilhouette side="left" />
          </div>
          <div
            data-intro-layer="palm-right"
            data-intro-track="palm-right"
            className="cinematic-palm-wrap cinematic-palm-wrap--right absolute"
          >
            <PalmSilhouette side="right" />
          </div>

          <div
            data-intro-layer="texture"
            className="cinematic-texture absolute inset-0"
          />
        </div>
      </div>

      <div className="cinematic-copy relative z-[3] grid w-full max-w-3xl place-items-center px-4 text-center text-plum sm:px-8">
        <div
          ref={primaryCopyRef}
          data-intro-copy="primary"
          data-intro-track="copy-primary"
          inert={copyIsWaiting ? true : undefined}
          className="col-start-1 row-start-1 flex flex-col items-center"
        >
          <p className="text-small font-bold uppercase tracking-label">
            {HERO.eyebrow}
          </p>
          <h1 className="mt-[18px] leading-[0.88] text-shadow-[0_5px_45px_var(--color-display-shadow)]">
            <span className="block font-serif text-display tracking-display">
              {HERO.title}
            </span>
            <span className="block font-serif text-[clamp(2.25rem,4.8vw,4rem)] italic leading-[1.1] tracking-display">
              {HERO.titleSub}
            </span>
          </h1>
        </div>

        <div
          ref={secondaryCopyRef}
          data-intro-copy="secondary"
          data-intro-track="copy-secondary"
          inert={copyIsWaiting ? true : undefined}
          className="col-start-1 row-start-2 mt-5 flex w-full flex-col items-center"
        >
          <p className="font-serif text-[clamp(1.35rem,2.5vw,2rem)] leading-[1.3]">
            {HERO.taglineLead}
            <em className="not-italic text-coral">{HERO.taglineEm}</em>
          </p>
          <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-5">
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
      </div>

      <div className="cinematic-meta pointer-events-none absolute inset-x-[clamp(22px,5vw,78px)] bottom-7 z-[4] flex justify-between text-caption uppercase tracking-label text-cream">
        <span>{HERO.metaLeft}</span>
        <span>{HERO.metaRight}</span>
      </div>
    </section>
  )
}

export default Hero
