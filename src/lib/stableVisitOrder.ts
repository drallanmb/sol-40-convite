export type VisitRankSource = () => string

type Identified = {
  id: string
}

function cryptographicRank(): string {
  const words = new Uint32Array(4)
  globalThis.crypto.getRandomValues(words)
  return Array.from(words, (word) => word.toString(16).padStart(8, '0')).join(
    '',
  )
}

/**
 * Owns random ranks for exactly one mounted visit. Ranks intentionally remain
 * in the map when an item disappears so a reactive removal/re-addition cannot
 * reshuffle the rest of the album.
 */
export class StableVisitOrder {
  readonly #ranks = new Map<string, string>()
  readonly #nextRank: VisitRankSource

  constructor(nextRank: VisitRankSource = cryptographicRank) {
    this.#nextRank = nextRank
  }

  get rankCount() {
    return this.#ranks.size
  }

  order<T extends Identified>(items: readonly T[]): T[] {
    for (const { id } of items) {
      if (!this.#ranks.has(id)) {
        this.#ranks.set(id, this.#nextRank())
      }
    }

    return [...items].sort((left, right) => {
      const rankComparison = this.#ranks
        .get(left.id)!
        .localeCompare(this.#ranks.get(right.id)!)
      return rankComparison || left.id.localeCompare(right.id)
    })
  }
}

export function createStableVisitOrder(
  nextRank?: VisitRankSource,
): StableVisitOrder {
  return new StableVisitOrder(nextRank)
}

export function orderForVisit<T extends Identified>(
  visit: StableVisitOrder,
  items: readonly T[],
): T[] {
  return visit.order(items)
}
