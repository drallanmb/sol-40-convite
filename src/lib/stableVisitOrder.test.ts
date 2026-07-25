import { describe, expect, it, vi } from 'vitest'
import {
  createStableVisitOrder,
  orderForVisit,
} from './stableVisitOrder'
import {
  createReducedMotionStore,
  type ReducedMotionMediaQuery,
} from '../hooks/useReducedMotion'

type Memory = {
  id: string
  label: string
}

function deterministicRanks(...ranks: string[]) {
  const remaining = [...ranks]
  return () => {
    const rank = remaining.shift()
    if (rank === undefined) {
      throw new Error('Unexpected random-rank request')
    }
    return rank
  }
}

describe('stable visit ordering', () => {
  it('assigns each ID one rank and preserves existing relative order on updates', () => {
    const visit = createStableVisitOrder(
      deterministicRanks('c', 'a', 'b', 'd'),
    )
    const first = [
      { id: 'sol', label: 'Sol' },
      { id: 'mar', label: 'Mar' },
      { id: 'ceu', label: 'Céu' },
    ]

    expect(orderForVisit(visit, first).map(({ id }) => id)).toEqual([
      'mar',
      'ceu',
      'sol',
    ])

    const withReactiveAddition = [
      ...first,
      { id: 'brisa', label: 'Brisa' },
    ]
    const updated = orderForVisit(visit, withReactiveAddition)

    expect(updated.map(({ id }) => id)).toEqual([
      'mar',
      'ceu',
      'sol',
      'brisa',
    ])
    expect(
      updated
        .filter(({ id }) => id !== 'brisa')
        .map(({ id }) => id),
    ).toEqual(['mar', 'ceu', 'sol'])
  })

  it('retains an ID rank when it is removed and later re-added', () => {
    const visit = createStableVisitOrder(deterministicRanks('b', 'a', 'c'))
    const memories: Memory[] = [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two' },
    ]

    orderForVisit(visit, memories)
    orderForVisit(visit, memories.filter(({ id }) => id !== 'two'))

    expect(orderForVisit(visit, memories).map(({ id }) => id)).toEqual([
      'two',
      'one',
    ])
    expect(visit.rankCount).toBe(2)
  })

  it('sorts a copy, leaves input untouched, and uses IDs to break rank ties', () => {
    const visit = createStableVisitOrder(deterministicRanks('same', 'same'))
    const source: Memory[] = [
      { id: 'z', label: 'Last by ID' },
      { id: 'a', label: 'First by ID' },
    ]
    const snapshot = [...source]

    const result = orderForVisit(visit, source)

    expect(result).not.toBe(source)
    expect(source).toEqual(snapshot)
    expect(result.map(({ id }) => id)).toEqual(['a', 'z'])
  })

  it('requests random ranks only for IDs not seen in this visit', () => {
    const nextRank = vi
      .fn<() => string>()
      .mockReturnValueOnce('2')
      .mockReturnValueOnce('1')
    const visit = createStableVisitOrder(nextRank)
    const memories: Memory[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]

    orderForVisit(visit, memories)
    orderForVisit(visit, [...memories].reverse())

    expect(nextRank).toHaveBeenCalledTimes(2)
  })
})

class FakeMediaQuery implements ReducedMotionMediaQuery {
  matches: boolean
  modernListeners = new Set<() => void>()
  legacyListeners = new Set<() => void>()

  constructor(matches: boolean) {
    this.matches = matches
  }

  addEventListener: ReducedMotionMediaQuery['addEventListener'] = vi.fn(
    (_type: 'change', listener: () => void) => {
      this.modernListeners.add(listener)
    },
  )

  removeEventListener: ReducedMotionMediaQuery['removeEventListener'] = vi.fn(
    (_type: 'change', listener: () => void) => {
      this.modernListeners.delete(listener)
    },
  )

  addListener = vi.fn((listener: () => void) => {
    this.legacyListeners.add(listener)
  })

  removeListener = vi.fn((listener: () => void) => {
    this.legacyListeners.delete(listener)
  })

  setMatches(matches: boolean) {
    this.matches = matches
    for (const listener of [
      ...this.modernListeners,
      ...this.legacyListeners,
    ]) {
      listener()
    }
  }
}

describe('reduced-motion store', () => {
  it('reads the initial query and subscribes/cleans up modern listeners', () => {
    const query = new FakeMediaQuery(true)
    const store = createReducedMotionStore(() => query)
    const onStoreChange = vi.fn()

    expect(store.getSnapshot()).toBe(true)
    const unsubscribe = store.subscribe(onStoreChange)
    query.setMatches(false)

    expect(onStoreChange).toHaveBeenCalledOnce()
    expect(store.getSnapshot()).toBe(false)

    unsubscribe()
    expect(query.removeEventListener).toHaveBeenCalledOnce()
    expect(query.modernListeners.size).toBe(0)
  })

  it('supports legacy listeners and returns false without a browser query', () => {
    const query = new FakeMediaQuery(false)
    query.addEventListener = undefined
    query.removeEventListener = undefined
    const store = createReducedMotionStore(() => query)
    const unsubscribe = store.subscribe(vi.fn())

    expect(store.getSnapshot()).toBe(false)
    expect(query.addListener).toHaveBeenCalledOnce()

    unsubscribe()
    expect(query.removeListener).toHaveBeenCalledOnce()
    expect(createReducedMotionStore(() => undefined).getSnapshot()).toBe(false)
  })
})
