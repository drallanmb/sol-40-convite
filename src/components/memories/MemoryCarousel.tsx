import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import { MEMORIES_COPY } from '../../content/event'
import useReducedMotion from '../../hooks/useReducedMotion'
import Button from '../ui/Button'
import MemoryCard, { type PublicMemory } from './MemoryCard'

const AUTOPLAY_DELAY_MS = 7_000

export type MemoryCarouselProps = {
  memories: readonly PublicMemory[]
}

function visibleSlideCount() {
  if (typeof window === 'undefined') return 1
  if (window.matchMedia('(min-width: 64rem)').matches) return 3
  if (window.matchMedia('(min-width: 40rem)').matches) return 2
  return 1
}

function useVisibleSlideCount() {
  const [count, setCount] = useState(visibleSlideCount)

  useEffect(() => {
    const update = () => setCount(visibleSlideCount())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return count
}

export function MemoryCarousel({ memories }: MemoryCarouselProps) {
  const reducedMotion = useReducedMotion()
  const visibleSlides = useVisibleSlideCount()
  const canMove = memories.length > visibleSlides
  const canRotate = canMove
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: AUTOPLAY_DELAY_MS,
        playOnInit: canRotate && !reducedMotion,
        stopOnFocusIn: true,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    [canRotate, reducedMotion],
  )
  const [viewportRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      containScroll: 'trimSnaps',
      dragFree: false,
      loop: canRotate,
      watchDrag: canMove,
    },
    canRotate ? [autoplay] : [],
  )
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [rotationPaused, setRotationPaused] = useState(
    reducedMotion || !canRotate,
  )

  const updateControls = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrevious(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  const pauseRotation = useCallback(() => {
    autoplay.stop()
    setRotationPaused(true)
  }, [autoplay])

  const resumeRotation = useCallback(() => {
    if (!canRotate || reducedMotion) return
    autoplay.play()
    setRotationPaused(false)
  }, [autoplay, canRotate, reducedMotion])

  useEffect(() => {
    if (!emblaApi) return

    const markPlaying = () => setRotationPaused(false)
    const markStopped = () => setRotationPaused(true)
    updateControls()
    emblaApi.on('select', updateControls)
    emblaApi.on('reInit', updateControls)
    emblaApi.on('autoplay:play', markPlaying)
    emblaApi.on('autoplay:stop', markStopped)

    return () => {
      emblaApi.off('select', updateControls)
      emblaApi.off('reInit', updateControls)
      emblaApi.off('autoplay:play', markPlaying)
      emblaApi.off('autoplay:stop', markStopped)
    }
  }, [emblaApi, updateControls])

  useEffect(() => {
    if (reducedMotion || !canRotate) pauseRotation()
  }, [canRotate, pauseRotation, reducedMotion])

  function scrollPrevious() {
    pauseRotation()
    emblaApi?.scrollPrev()
  }

  function scrollNext() {
    pauseRotation()
    emblaApi?.scrollNext()
  }

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label={MEMORIES_COPY.album.label}
      onFocusCapture={pauseRotation}
      onMouseEnter={pauseRotation}
      className="grid gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="quiet"
          onClick={rotationPaused ? resumeRotation : pauseRotation}
          disabled={!canRotate || reducedMotion}
          aria-label={
            reducedMotion
              ? MEMORIES_COPY.album.reducedLabel
              : rotationPaused
                ? MEMORIES_COPY.album.resume
                : MEMORIES_COPY.album.pause
          }
          className="min-w-[12rem]"
        >
          {reducedMotion
            ? MEMORIES_COPY.album.reduced
            : rotationPaused
              ? MEMORIES_COPY.album.resume
              : MEMORIES_COPY.album.pause}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="quiet"
            onClick={scrollPrevious}
            disabled={!canMove || !canScrollPrevious}
            aria-label={MEMORIES_COPY.album.previous}
            className="size-11 p-0!"
          >
            <span aria-hidden="true">←</span>
          </Button>
          <Button
            variant="quiet"
            onClick={scrollNext}
            disabled={!canMove || !canScrollNext}
            aria-label={MEMORIES_COPY.album.next}
            className="size-11 p-0!"
          >
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        <div className="-ml-5 flex touch-pan-y">
          {memories.map((memory, index) => (
            <div
              key={memory.id}
              role="group"
              aria-roledescription="slide"
              aria-label={MEMORIES_COPY.album.slideLabel
                .replace('{current}', String(index + 1))
                .replace('{total}', String(memories.length))}
              className="min-w-0 flex-[0_0_100%] pl-5 sm:flex-[0_0_50%] lg:flex-[0_0_33.333333%]"
            >
              <MemoryCard memory={memory} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MemoryCarousel
