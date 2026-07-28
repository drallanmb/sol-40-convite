import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MemoryCard, { type PublicMemory } from './MemoryCard'

const PHOTO_MESSAGE = 'Um dia recheado de bênçãos e alegria.'

const PHOTO_MEMORY = {
  id: 'memory-photo',
  author: 'Ale Lima',
  message: PHOTO_MESSAGE,
  imageUrl: 'https://example.com/memory.jpg',
  createdAt: 1,
} as PublicMemory

describe('MemoryCard', () => {
  it('keeps the message on an opaque panel outside the clipped photo frame', () => {
    const markup = renderToStaticMarkup(<MemoryCard memory={PHOTO_MEMORY} />)

    expect(markup).toContain(
      'h-[20rem] shrink-0 place-items-center overflow-hidden bg-sand/55',
    )
    expect(markup).toContain('block h-full w-full object-contain')
    expect(markup).toContain(
      'relative z-10 flex min-h-0 flex-1 flex-col gap-5 bg-card',
    )

    const imagePosition = markup.indexOf('<img')
    const messagePosition = markup.indexOf(PHOTO_MESSAGE)

    expect(imagePosition).toBeGreaterThan(-1)
    expect(messagePosition).toBeGreaterThan(imagePosition)
  })
})
