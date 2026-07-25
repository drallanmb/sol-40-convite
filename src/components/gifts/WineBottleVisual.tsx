import { useId, type CSSProperties } from 'react'
import type { PublicWine } from '../../../convex/wineModel'

type WineBottleVisualProps = {
  wine: Pick<PublicWine, 'palettePrimary' | 'paletteSecondary'>
}

type PaletteStyle = CSSProperties & {
  '--wine-palette-primary': string
  '--wine-palette-secondary': string
}

export function WineBottleVisual({ wine }: WineBottleVisualProps) {
  const gradientId = `wine-bottle-glass-${useId().replaceAll(':', '')}`
  const paletteStyle: PaletteStyle = {
    '--wine-palette-primary': wine.palettePrimary,
    '--wine-palette-secondary': wine.paletteSecondary,
  }

  return (
    <div
      aria-hidden="true"
      className="wine-bottle-stage relative grid h-[264px] w-full place-items-center overflow-hidden"
      style={paletteStyle}
    >
      <span className="wine-palette-halo absolute h-[180px] w-[180px] rounded-full opacity-80 md:h-[204px] md:w-[204px]" />
      <svg
        viewBox="0 0 132 248"
        className="relative h-[232px] w-[116px] md:h-[248px] md:w-[132px]"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-bottle-shadow)" />
            <stop offset=".34" stopColor="var(--color-bottle-light)" />
            <stop offset=".58" stopColor="var(--color-bottle-deep)" />
            <stop offset=".82" stopColor="var(--color-bottle-mid)" />
            <stop offset="1" stopColor="var(--color-bottle-black)" />
          </linearGradient>
        </defs>
        <path
          fill="var(--color-bottle-deep)"
          d="M51 2h30v42c0 7 3 13 9 18 10 9 16 22 16 36v138c0 7-5 12-12 12H38c-7 0-12-5-12-12V98c0-14 6-27 16-36 6-5 9-11 9-18V2Z"
        />
        <path
          fill={`url(#${gradientId})`}
          d="M55 8h22v39c0 10 4 18 12 25 7 7 11 16 11 27v137c0 3-2 6-6 6H38c-4 0-6-3-6-6V99c0-11 4-20 11-27 8-7 12-15 12-25V8Z"
        />
        <path
          fill="var(--color-cream)"
          d="M39 121h54v65H39z"
          opacity=".94"
        />
        <path
          fill="var(--color-bottle-highlight)"
          d="M42 75c6-8 10-16 10-27V15h5v34c0 12-4 22-12 31-5 6-8 14-8 24v122h-5V101c0-10 3-19 10-26Z"
          opacity=".13"
        />
        <path fill="var(--color-bottle-cap)" d="M48 0h36v12H48z" />
        <path fill="var(--color-bottle-rim)" d="M53 3h26v2H53z" opacity=".55" />
      </svg>
    </div>
  )
}

export default WineBottleVisual
