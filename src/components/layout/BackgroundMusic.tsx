import { useEffect, useRef, useState } from 'react'

const BACKGROUND_MUSIC_VOLUME = 0.18

type BackgroundMusicProps = {
  enabled: boolean
}

function BackgroundMusic({ enabled }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = BACKGROUND_MUSIC_VOLUME
  }, [])

  useEffect(() => {
    if (enabled) return

    audioRef.current?.pause()
  }, [enabled])

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio || isUnavailable) return

    if (!audio.paused) {
      audio.pause()
      return
    }

    try {
      await audio.play()
    } catch {
      setAnnouncement(
        'Não foi possível iniciar a música. Toque novamente para tentar.',
      )
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        loop
        preload={enabled ? 'metadata' : 'none'}
        onPlay={() => {
          setIsPlaying(true)
          setAnnouncement('Trilha Ô Sol tocando.')
        }}
        onPause={() => {
          setIsPlaying(false)
          setAnnouncement('Trilha Ô Sol pausada.')
        }}
        onError={() => {
          setIsPlaying(false)
          setIsUnavailable(true)
          setAnnouncement('A trilha Ô Sol não pôde ser carregada.')
        }}
      >
        <source src="/audio/o-sol.mp3" type="audio/mpeg" />
      </audio>

      {enabled ? (
        <div className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.5rem)] right-4 z-(--z-status) sm:bottom-20 sm:right-6">
          <button
            type="button"
            aria-label={
              isUnavailable
                ? 'Trilha Ô Sol indisponível'
                : isPlaying
                  ? 'Pausar trilha Ô Sol'
                  : 'Tocar trilha Ô Sol'
            }
            aria-pressed={isPlaying}
            disabled={isUnavailable}
            onClick={togglePlayback}
            className="group flex min-h-11 items-center gap-3 rounded-full border border-cream/20 bg-plum/92 py-2 pl-3 pr-4 text-cream shadow-[0_8px_24px_rgba(53,25,42,0.24)] backdrop-blur-md transition-[background-color,transform,opacity] duration-(--duration-fast) ease-out hover:-translate-y-0.5 hover:bg-plum focus-visible:bg-plum active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
          >
            <span
              aria-hidden="true"
              className={`music-bars flex h-5 w-5 items-end justify-center gap-[2px] ${
                isPlaying ? 'music-bars--playing' : ''
              }`}
            >
              <span className="music-bars__bar h-2" />
              <span className="music-bars__bar h-4" />
              <span className="music-bars__bar h-3" />
            </span>

            <span className="grid text-left leading-none">
              <span className="font-serif text-[1rem] italic">Ô Sol</span>
              <span className="mt-1 text-[0.625rem] font-bold uppercase tracking-label text-peach">
                {isUnavailable
                  ? 'indisponível'
                  : isPlaying
                    ? 'tocando'
                    : 'ouvir'}
              </span>
            </span>

            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-full bg-cream text-plum transition-colors duration-(--duration-fast) ease-out group-hover:bg-peach"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M8 5.6v12.8a1 1 0 0 0 1.55.83l9.15-6.4a1 1 0 0 0 0-1.66L9.55 4.77A1 1 0 0 0 8 5.6Z" />
                </svg>
              )}
            </span>
          </button>

          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
        </div>
      ) : null}
    </>
  )
}

export default BackgroundMusic
