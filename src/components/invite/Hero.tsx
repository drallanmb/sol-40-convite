import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { HERO, SECTION_IDS } from '../../content/event'
import {
  CINEMATIC_INTRO_DURATION_MS,
  CINEMATIC_INTRO_EASING,
  CINEMATIC_INTRO_GLOW_ONSET_MS,
  CINEMATIC_INTRO_INTENT_MAX_MS,
  CINEMATIC_INTRO_SUN_ARRIVAL_MS,
  CINEMATIC_INTRO_RETARGET_MS,
  INTRO_COPY_TIMING,
  hasIntentionalIntroScroll,
  normalizeIntroProgress,
  resolveConstantSpeedSunPath,
  resolveIntentPlaybackRate,
  resolveIntroComposition,
  resolveSunArc,
  type IntroCompletionReason,
  type IntroComposition,
  type IntroPoint,
  type RectLike,
  type IntroState,
} from '../../lib/cinematicIntro'
import { buttonClassName } from '../ui/Button'
import { SeaWaves } from './SeaWaves'

export type HeroProps = {
  introState: IntroState
  introRunGeneration: number
  onIntroComplete: (reason: IntroCompletionReason) => void
}

const PRIMARY_COPY_ONSET =
  INTRO_COPY_TIMING.primaryStartMs / CINEMATIC_INTRO_DURATION_MS
const SECONDARY_COPY_ONSET =
  INTRO_COPY_TIMING.secondaryStartMs / CINEMATIC_INTRO_DURATION_MS
const CTA_COPY_ONSET =
  INTRO_COPY_TIMING.ctaStartMs / CINEMATIC_INTRO_DURATION_MS
const GEOMETRY_EPSILON_PX = 0.5
const SUN_START_SCALE = 0.84

type IntroTrackName =
  | 'camera'
  | 'cool-veil'
  | 'warm-horizon'
  | 'sun-arc'
  | 'haze'
  | 'copy-primary'
  | 'copy-secondary'
  | 'copy-cta'

type IntroTrackDefinition = {
  track: IntroTrackName
  durationMs: number
  keyframes: Keyframe[]
}

type ActiveIntroTrack = {
  track: IntroTrackName
  durationMs: number
  owner: HTMLElement
  animation: Animation
}

type CinematicIntroController = {
  animations: ActiveIntroTrack[]
  getProgress: () => number
  accelerate: () => void
  retarget: () => void
  commitFinal: (reason: IntroCompletionReason) => void
  dispose: () => void
}

function toRectLike(rect: DOMRect): RectLike {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function translatePoint(point: IntroPoint, scale: number): string {
  return `translate3d(${point.x}px, ${point.y}px, 0) scale(${scale})`
}

function geometryChanged(previous: RectLike, next: RectLike): boolean {
  return (['left', 'top', 'width', 'height'] as const).some(
    (key) => Math.abs(previous[key] - next[key]) > GEOMETRY_EPSILON_PX,
  )
}

function absoluteOffset(timeMs: number): number {
  return timeMs / CINEMATIC_INTRO_DURATION_MS
}

function buildCopyRevealKeyframes(
  startMs: number,
  translateY: number,
): Keyframe[] {
  const holdOffset = absoluteOffset(Math.max(0, startMs - 20))
  const onsetOffset = absoluteOffset(startMs)
  const hiddenTransform = `translate3d(0, ${translateY}px, 0)`

  return [
    {
      offset: 0,
      clipPath: 'inset(0 0 100% 0)',
      transform: hiddenTransform,
    },
    {
      offset: holdOffset,
      clipPath: 'inset(0 0 100% 0)',
      transform: hiddenTransform,
    },
    {
      offset: onsetOffset,
      clipPath: 'inset(0 0 96% 0)',
      transform: `translate3d(0, ${translateY * 0.92}px, 0)`,
    },
    {
      offset: 1,
      clipPath: 'inset(0 0 0 0)',
      transform: 'none',
    },
  ]
}

function buildTrackDefinitions(
  stage: RectLike,
  target: RectLike,
  composition: IntroComposition,
): IntroTrackDefinition[] {
  const sunPath = resolveConstantSpeedSunPath(
    resolveSunArc(stage, target, composition),
  )
  const mobile = composition === 'mobile'
  const sunArrivalOffset = absoluteOffset(CINEMATIC_INTRO_SUN_ARRIVAL_MS)
  const glowOnsetOffset = absoluteOffset(CINEMATIC_INTRO_GLOW_ONSET_MS)
  const secondaryOnsetOffset = absoluteOffset(
    INTRO_COPY_TIMING.secondaryStartMs,
  )
  const sunKeyframes = sunPath.map<Keyframe>(
    (sample, index) => ({
      offset: sample.progress,
      transform:
        index === sunPath.length - 1
          ? 'none'
          : translatePoint(
            sample,
            SUN_START_SCALE + (1 - SUN_START_SCALE) * sample.progress,
          ),
    }),
  )

  return [
    {
      track: 'camera',
      durationMs: CINEMATIC_INTRO_DURATION_MS,
      keyframes: [
        {
          offset: 0,
          transform: mobile
            ? 'translate3d(0, 1.8%, 0) scale(1.038)'
            : 'translate3d(0, 2.4%, 0) scale(1.052)',
        },
        {
          offset: 0.68 * sunArrivalOffset,
          transform: 'translate3d(0, .5%, 0) scale(1.012)',
          easing: 'cubic-bezier(.22,.72,.2,1)',
        },
        { offset: sunArrivalOffset, transform: 'none' },
        { offset: 1, transform: 'none' },
      ],
    },
    {
      track: 'cool-veil',
      durationMs: CINEMATIC_INTRO_DURATION_MS,
      keyframes: [
        { offset: 0, opacity: 0.72 },
        { offset: 0.54 * sunArrivalOffset, opacity: 0.28 },
        { offset: sunArrivalOffset, opacity: 0 },
        { offset: 1, opacity: 0 },
      ],
    },
    {
      track: 'warm-horizon',
      durationMs: CINEMATIC_INTRO_DURATION_MS,
      keyframes: [
        { offset: 0, opacity: 0, transform: 'scale3d(.72, .72, 1)' },
        {
          offset: glowOnsetOffset,
          opacity: 0,
          transform: 'scale3d(.82, .78, 1)',
        },
        {
          offset: secondaryOnsetOffset,
          opacity: 0.58,
          transform: 'scale3d(.95, .92, 1)',
        },
        { offset: 1, opacity: 1, transform: 'none' },
      ],
    },
    {
      track: 'sun-arc',
      durationMs: CINEMATIC_INTRO_SUN_ARRIVAL_MS,
      keyframes: sunKeyframes,
    },
    {
      track: 'haze',
      durationMs: CINEMATIC_INTRO_DURATION_MS,
      keyframes: [
        { offset: 0, opacity: 0, transform: 'scale3d(.72, .62, 1)' },
        {
          offset: glowOnsetOffset,
          opacity: 0,
          transform: 'scale3d(.82, .74, 1)',
        },
        {
          offset: secondaryOnsetOffset,
          opacity: 0.54,
          transform: 'scale3d(.95, .9, 1)',
        },
        { offset: 1, opacity: 1, transform: 'none' },
      ],
    },
    {
      track: 'copy-primary',
      durationMs: CINEMATIC_INTRO_DURATION_MS,
      keyframes: buildCopyRevealKeyframes(
        INTRO_COPY_TIMING.primaryStartMs,
        12,
      ),
    },
    {
      track: 'copy-secondary',
      durationMs: CINEMATIC_INTRO_DURATION_MS,
      keyframes: buildCopyRevealKeyframes(
        INTRO_COPY_TIMING.secondaryStartMs,
        10,
      ),
    },
    {
      track: 'copy-cta',
      durationMs: CINEMATIC_INTRO_DURATION_MS,
      keyframes: buildCopyRevealKeyframes(
        INTRO_COPY_TIMING.ctaStartMs,
        10,
      ),
    },
  ]
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
  const ctaCopyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (introState !== 'playing') return

    const root = heroRef.current
    const primaryCopy = primaryCopyRef.current
    const secondaryCopy = secondaryCopyRef.current
    const ctaCopy = ctaCopyRef.current
    if (!root || !primaryCopy || !secondaryCopy || !ctaCopy) {
      onIntroComplete('error')
      return
    }

    let completed = false
    let disposed = false
    let interactionFrame = 0
    let resizeFrame = 0
    let resizeObserver: ResizeObserver | null = null
    let retargetAnimation: Animation | null = null
    let masterTrack: ActiveIntroTrack | null = null
    let lastStage: RectLike | null = null
    let lastTarget: RectLike | null = null
    let intentAccelerated = false
    const startScrollY = window.scrollY
    const listenerController = new AbortController()
    const activeTracks: ActiveIntroTrack[] = []

    const target = root.querySelector<HTMLElement>(
      '[data-intro-sun-target]',
    )
    const retargetWrapper = root.querySelector<HTMLElement>(
      '[data-intro-sun-retarget]',
    )
    const sun = root.querySelector<HTMLElement>('[data-intro-sun]')

    let controller: CinematicIntroController

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

      if (progress >= CTA_COPY_ONSET) {
        ctaCopy.removeAttribute('inert')
      } else {
        ctaCopy.setAttribute('inert', '')
      }
    }

    const cancelAnimation = (
      animation: Animation,
      failOpen: boolean,
    ): boolean => {
      let handlerDetached = false
      try {
        animation.onfinish = null
        handlerDetached = true
      } catch {
        // Continue to cancel/detach the effect: a broken event setter must
        // never keep the previous generation visually alive.
      }

      try {
        animation.cancel()
        return true
      } catch {
        // Some partial/polyfilled WAAPI implementations can throw from
        // cancel(). Detaching the effect is the independent escape hatch that
        // prevents a stale fill or running animation from surviving bfcache,
        // remount or fail-open completion.
      }

      try {
        animation.effect = null
        return animation.effect === null
      } catch {
        if (failOpen || !handlerDetached) controller.commitFinal('error')
        return false
      }
    }

    const cleanupHandles = (failOpen: boolean) => {
      if (interactionFrame) {
        window.cancelAnimationFrame(interactionFrame)
        interactionFrame = 0
      }
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame)
        resizeFrame = 0
      }

      try {
        listenerController.abort()
      } catch {
        if (failOpen) controller.commitFinal('error')
      }

      try {
        resizeObserver?.disconnect()
      } catch {
        if (failOpen) controller.commitFinal('error')
      }
      resizeObserver = null

      if (retargetAnimation) {
        const correction = retargetAnimation
        retargetAnimation = null
        cancelAnimation(correction, failOpen)
      }
      if (retargetWrapper) retargetWrapper.style.transform = 'none'

      for (const { animation } of activeTracks) {
        try {
          cancelAnimation(animation, failOpen)
        } catch {
          if (failOpen) controller.commitFinal('error')
        }
      }
    }

    const commitFinal = (reason: IntroCompletionReason) => {
      if (completed || disposed) return
      completed = true
      root.dataset.introState = 'complete'
      primaryCopy.removeAttribute('inert')
      secondaryCopy.removeAttribute('inert')
      ctaCopy.removeAttribute('inert')
      cleanupHandles(false)
      onIntroComplete(reason)
    }

    const dispose = () => {
      if (disposed) return
      disposed = true
      cleanupHandles(false)
    }

    const getProgress = () => {
      if (!masterTrack) return 1
      try {
        return normalizeIntroProgress(
          Number(masterTrack.animation.currentTime),
          CINEMATIC_INTRO_DURATION_MS,
        )
      } catch {
        commitFinal('error')
        return 1
      }
    }

    const createTrack = (
      owner: HTMLElement,
      definition: IntroTrackDefinition,
    ): ActiveIntroTrack | null => {
      try {
        const animation = owner.animate(definition.keyframes, {
          duration: definition.durationMs,
          easing: CINEMATIC_INTRO_EASING,
          fill: 'both',
          iterations: 1,
        })
        const track = {
          track: definition.track,
          durationMs: definition.durationMs,
          owner,
          animation,
        }
        activeTracks.push(track)
        return track
      } catch {
        commitFinal('error')
        return null
      }
    }

    const setAnimationTime = (
      animation: Animation,
      currentTime: number,
    ): boolean => {
      try {
        animation.currentTime = currentTime
        return true
      } catch {
        commitFinal('error')
        return false
      }
    }

    const pauseAnimation = (animation: Animation): boolean => {
      try {
        animation.pause()
        return true
      } catch {
        commitFinal('error')
        return false
      }
    }

    const playAnimation = (animation: Animation): boolean => {
      try {
        animation.play()
        return true
      } catch {
        commitFinal('error')
        return false
      }
    }

    const replaceKeyframes = (
      track: ActiveIntroTrack,
      definition: IntroTrackDefinition,
    ): boolean => {
      try {
        const effect = track.animation.effect
        if (!(effect instanceof KeyframeEffect)) {
          throw new Error(`Missing keyframe effect for ${track.track}`)
        }
        effect.setKeyframes(definition.keyframes)
        return true
      } catch {
        commitFinal('error')
        return false
      }
    }

    const updatePlaybackRate = (
      track: ActiveIntroTrack,
      remainingMs: number,
    ): boolean => {
      try {
        const nextRate = resolveIntentPlaybackRate(
          remainingMs,
          CINEMATIC_INTRO_INTENT_MAX_MS,
          track.animation.playbackRate,
        )
        track.animation.updatePlaybackRate(nextRate)
        return true
      } catch {
        commitFinal('error')
        return false
      }
    }

    const accelerate = () => {
      if (completed || disposed || intentAccelerated || !masterTrack) return
      intentAccelerated = true
      root.dataset.introIntent = 'accelerated'
      root.dataset.introIntentTargetMs = String(
        CINEMATIC_INTRO_INTENT_MAX_MS,
      )

      for (const track of activeTracks) {
        let currentTime = 0
        try {
          currentTime = Number(track.animation.currentTime ?? 0)
        } catch {
          commitFinal('error')
          return
        }
        const remainingMs = Math.max(0, track.durationMs - currentTime)
        if (!updatePlaybackRate(track, remainingMs)) return
      }
    }

    const retarget = () => {
      if (
        completed
        || disposed
        || !target
        || !retargetWrapper
        || !sun
        || !lastStage
        || !lastTarget
      ) {
        return
      }

      try {
        const progress = getProgress()
        if (completed) return
        const before = sun.getBoundingClientRect()

        for (const { animation } of activeTracks) {
          if (!pauseAnimation(animation)) return
        }
        for (const { animation } of activeTracks) {
          if (!setAnimationTime(animation, CINEMATIC_INTRO_DURATION_MS)) {
            return
          }
        }

        const nextStage = toRectLike(root.getBoundingClientRect())
        const nextTarget = toRectLike(target.getBoundingClientRect())
        if (
          !geometryChanged(lastStage, nextStage)
          && !geometryChanged(lastTarget, nextTarget)
        ) {
          for (const { animation } of activeTracks) {
            if (!setAnimationTime(
              animation,
              progress * CINEMATIC_INTRO_DURATION_MS,
            )) {
              return
            }
            if (!playAnimation(animation)) return
          }
          return
        }

        const nextDefinitions = buildTrackDefinitions(
          nextStage,
          nextTarget,
          resolveIntroComposition(nextStage),
        )
        for (const track of activeTracks) {
          const definition = nextDefinitions.find(
            ({ track: name }) => name === track.track,
          )
          if (!definition || !replaceKeyframes(track, definition)) return
        }
        for (const { animation } of activeTracks) {
          if (!setAnimationTime(
            animation,
            progress * CINEMATIC_INTRO_DURATION_MS,
          )) {
            return
          }
        }

        const after = sun.getBoundingClientRect()
        const beforeCenterX = before.left + before.width / 2
        const beforeCenterY = before.top + before.height / 2
        const afterCenterX = after.left + after.width / 2
        const afterCenterY = after.top + after.height / 2
        const scaleX = after.width > 0 ? before.width / after.width : 1
        const scaleY = after.height > 0 ? before.height / after.height : 1
        const correction = `translate3d(${
          beforeCenterX - afterCenterX
        }px, ${beforeCenterY - afterCenterY}px, 0) scale3d(${
          scaleX
        }, ${scaleY}, 1)`

        if (retargetAnimation) {
          const previousCorrection = retargetAnimation
          retargetAnimation = null
          if (!cancelAnimation(previousCorrection, true)) return
        }
        retargetWrapper.style.transform = correction
        try {
          retargetAnimation = retargetWrapper.animate(
            [
              { transform: correction },
              { transform: 'none' },
            ],
            {
              duration: CINEMATIC_INTRO_RETARGET_MS,
              easing: 'cubic-bezier(.4,0,.2,1)',
              fill: 'both',
              iterations: 1,
            },
          )
        } catch {
          commitFinal('error')
          return
        }

        const activeCorrection = retargetAnimation
        try {
          activeCorrection.onfinish = () => {
            if (completed || disposed || retargetAnimation !== activeCorrection) {
              return
            }
            retargetWrapper.style.transform = 'none'
            retargetAnimation = null
            cancelAnimation(activeCorrection, true)
          }
        } catch {
          commitFinal('error')
          return
        }

        lastStage = nextStage
        lastTarget = nextTarget
        for (const { animation } of activeTracks) {
          if (!playAnimation(animation)) return
        }
      } catch {
        commitFinal('error')
      }
    }

    controller = {
      animations: activeTracks,
      getProgress,
      accelerate,
      retarget,
      commitFinal,
      dispose,
    }

    try {
      if (
        !target
        || !retargetWrapper
        || !sun
        || typeof sun.animate !== 'function'
        || typeof ResizeObserver !== 'function'
      ) {
        throw new Error('Cinematic intro scene APIs are unavailable')
      }

      lastStage = toRectLike(root.getBoundingClientRect())
      lastTarget = toRectLike(target.getBoundingClientRect())
      const definitions = buildTrackDefinitions(
        lastStage,
        lastTarget,
        resolveIntroComposition(lastStage),
      )

      for (const definition of definitions) {
        const owner = root.querySelector<HTMLElement>(
          `[data-intro-track="${definition.track}"]`,
        )
        if (!owner) throw new Error(`Missing cinematic track: ${definition.track}`)
        const track = createTrack(owner, definition)
        if (!track || completed) return controller.dispose
        if (definition.track === 'camera') masterTrack = track
      }

      if (!masterTrack) throw new Error('Cinematic intro master is unavailable')
      setCopyAvailability(0)
      try {
        masterTrack.animation.onfinish = () => commitFinal('finished')
      } catch {
        commitFinal('error')
        return controller.dispose
      }

      const updateInteraction = () => {
        if (disposed || completed) return
        try {
          const progress = getProgress()
          setCopyAvailability(progress)
          if (progress >= 1) {
            commitFinal('finished')
            return
          }
          interactionFrame = window.requestAnimationFrame(updateInteraction)
        } catch {
          commitFinal('error')
        }
      }
      interactionFrame = window.requestAnimationFrame(updateInteraction)

      const scheduleRetarget = () => {
        if (completed || disposed || resizeFrame) return
        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = 0
          controller.retarget()
        })
      }
      resizeObserver = new ResizeObserver(scheduleRetarget)
      resizeObserver.observe(root)
      resizeObserver.observe(target)

      const onScroll = () => {
        if (hasIntentionalIntroScroll(startScrollY, window.scrollY)) {
          controller.accelerate()
        }
      }
      const eventTargetsIntent = (event: Event) =>
        event.target instanceof Element
        && Boolean(event.target.closest('[data-intro-intent]'))
      const onPointerIntent = (event: PointerEvent) => {
        if (eventTargetsIntent(event)) controller.accelerate()
      }
      const onFocusIntent = (event: FocusEvent) => {
        if (eventTargetsIntent(event)) controller.accelerate()
      }
      const signal = listenerController.signal
      window.addEventListener('scroll', onScroll, { passive: true, signal })
      document.addEventListener('pointerdown', onPointerIntent, {
        capture: true,
        passive: true,
        signal,
      })
      document.addEventListener('focusin', onFocusIntent, {
        capture: true,
        signal,
      })
    } catch {
      commitFinal('error')
    }

    return controller.dispose
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
      data-intro-generation={introRunGeneration}
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
            data-intro-sun-target
            className="cinematic-sun-target absolute"
          >
            <div
              data-intro-sun-retarget
              className="cinematic-sun-retarget h-full w-full"
            >
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
            data-intro-layer="sea"
            className="absolute inset-0"
          >
            <SeaWaves />
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
          className="cinematic-copy-reveal col-start-1 row-start-1 flex flex-col items-center"
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
          className="cinematic-copy-reveal col-start-1 row-start-2 mt-5 flex w-full flex-col items-center"
        >
          <p className="font-serif text-[clamp(1.35rem,2.5vw,2rem)] leading-[1.3]">
            {HERO.taglineLead}
            <em className="not-italic text-coral">{HERO.taglineEm}</em>
          </p>
        </div>

        <div
          ref={ctaCopyRef}
          data-intro-copy="cta"
          data-intro-track="copy-cta"
          data-intro-intent
          inert={copyIsWaiting ? true : undefined}
          className="cinematic-copy-reveal col-start-1 row-start-3 mt-7 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-5"
        >
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

      <div className="cinematic-meta pointer-events-none absolute inset-x-[clamp(22px,5vw,78px)] bottom-7 z-[4] flex justify-between text-caption uppercase tracking-label text-cream">
        <span>{HERO.metaLeft}</span>
        <span>{HERO.metaRight}</span>
      </div>
    </section>
  )
}

export default Hero
