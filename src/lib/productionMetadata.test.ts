import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectFile = (path: string) => resolve(process.cwd(), path)
const html = readFileSync(projectFile('index.html'), 'utf8')

function attributeValues(tagPattern: RegExp, attribute: string) {
  return [...html.matchAll(tagPattern)].map((match) => {
    const tag = match[0]
    const value = tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'))?.[1]
    return value
  })
}

describe('production metadata', () => {
  it('uses exactly one canonical production origin', () => {
    expect(
      attributeValues(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, 'href'),
    ).toEqual(['https://www.sol40.com.br/'])
    expect(
      attributeValues(
        /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi,
        'content',
      ),
    ).toEqual(['https://www.sol40.com.br/'])
  })

  it('uses one absolute production Open Graph image backed by the 1200x630 asset', () => {
    expect(
      attributeValues(
        /<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/gi,
        'content',
      ),
    ).toEqual(['https://www.sol40.com.br/og.jpg'])
    expect(existsSync(projectFile('public/og.jpg'))).toBe(true)
    expect(readFileSync(projectFile('public/og.jpg')).subarray(0, 2)).toEqual(
      Buffer.from([0xff, 0xd8]),
    )
  })

  it('declares a large Twitter card and rejects preview origins or a dead runtime-origin contract', () => {
    expect(
      attributeValues(
        /<meta\b[^>]*\bname=["']twitter:card["'][^>]*>/gi,
        'content',
      ),
    ).toEqual(['summary_large_image'])

    const productionContract = [
      html,
      readFileSync(projectFile('DEPLOY.md'), 'utf8'),
      readFileSync(projectFile('.env.example'), 'utf8'),
    ].join('\n')

    expect(productionContract).not.toMatch(/\.vercel\.app/i)
    expect(productionContract).not.toContain('PUBLIC_ORIGIN')
  })
})
