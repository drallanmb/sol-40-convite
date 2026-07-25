import { useEffect, useState } from 'react'
import type { PublicWine } from '../../../convex/wineModel'
import { GIFTS_COPY } from '../../content/gifts'

type WineImageProps = {
  wine: Pick<PublicWine, 'imageUrl' | 'name' | 'tone'>
  eager?: boolean
}

type AssetState = 'checking' | 'ready' | 'pending' | 'failed'

type ManifestAsset = {
  path?: unknown
  status?: unknown
}

type AssetManifest = {
  assets?: ManifestAsset[]
}

let manifestRequest: Promise<AssetManifest | null> | undefined

function readAssetManifest() {
  manifestRequest ??= fetch('/wines/manifest.json')
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null) as Promise<AssetManifest | null>
  return manifestRequest
}

const HALO_CLASSES: Record<PublicWine['tone'], string> = {
  rubi: 'bg-halo-rubi',
  dourado: 'bg-halo-dourado',
  rose: 'bg-halo-rose',
  verde: 'bg-halo-verde',
}

export function WineImage({ wine, eager = false }: WineImageProps) {
  const [assetState, setAssetState] = useState<AssetState>(
    import.meta.env.DEV ? 'checking' : 'ready',
  )

  useEffect(() => {
    let active = true

    void readAssetManifest().then((manifest) => {
      if (!active || !manifest?.assets) return
      const entry = manifest.assets.find((asset) => asset.path === wine.imageUrl)
      setAssetState(entry?.status === 'pending' ? 'pending' : 'ready')
    })

    return () => {
      active = false
    }
  }, [wine.imageUrl])

  const showDevelopmentPlaceholder =
    import.meta.env.DEV &&
    (assetState === 'checking' || assetState === 'pending')
  const showFailure = assetState === 'failed'

  return (
    <div
      className="wine-image-stage relative grid h-[264px] w-full place-items-center overflow-hidden"
      data-tone={wine.tone}
    >
      <span
        aria-hidden="true"
        className={`absolute h-[180px] w-[180px] rounded-full opacity-45 blur-[1px] md:h-[204px] md:w-[204px] ${HALO_CLASSES[wine.tone]}`}
      />

      {showDevelopmentPlaceholder ? (
        <span
          aria-label={`${GIFTS_COPY.image.development}. Apenas em desenvolvimento.`}
          data-development-placeholder="true"
          className="relative z-[1] max-w-[18ch] text-center text-[13px] font-bold uppercase leading-[1.35] tracking-label text-cellar-muted"
        >
          {GIFTS_COPY.image.development}
        </span>
      ) : null}

      {showFailure ? (
        <span
          role="img"
          aria-label={GIFTS_COPY.image.failure}
          className="relative z-[1] max-w-[18ch] text-center text-[13px] font-bold uppercase leading-[1.35] tracking-label text-cellar-muted"
        >
          {GIFTS_COPY.image.failure}
        </span>
      ) : null}

      {!showDevelopmentPlaceholder && !showFailure ? (
        <img
          src={wine.imageUrl}
          alt={`Garrafa do vinho ${wine.name}`}
          width={720}
          height={960}
          decoding="async"
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          onError={() => setAssetState('failed')}
          className="relative z-[1] h-[232px] w-[116px] object-contain md:h-[248px] md:w-[132px]"
        />
      ) : null}
    </div>
  )
}

export default WineImage
