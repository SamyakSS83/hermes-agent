import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { evictInkCaches } from './cache-eviction.js'
import { wrapStringWidth } from './wrap-width-cache.js'

beforeEach(() => evictInkCaches('all'))
afterEach(() => { vi.restoreAllMocks(); evictInkCaches('all') })

it('honors host half/all eviction with LRU recency and reusable size accounting', () => {
  evictInkCaches('all')
  const segment = vi.spyOn(Intl.Segmenter.prototype, 'segment')
  const words = ['eviction-a', 'eviction-b', 'eviction-c', 'eviction-d']
  words.forEach(wrapStringWidth)
  wrapStringWidth(words[0])
  evictInkCaches('half')
  wrapStringWidth(words[0])
  wrapStringWidth(words[3])
  wrapStringWidth(words[1])

  expect(segment.mock.calls.filter(([text]) => text === words[0])).toHaveLength(1)
  expect(segment.mock.calls.filter(([text]) => text === words[1])).toHaveLength(2)
  evictInkCaches('all')
  wrapStringWidth(words[0])
  expect(segment.mock.calls.filter(([text]) => text === words[0])).toHaveLength(2)
  segment.mockRestore()
  evictInkCaches('all')
})

it('bounds entry count and retains recently used measurements', () => {
  const segment = vi.spyOn(Intl.Segmenter.prototype, 'segment')
  const hot = 'hot👩‍💻'
  const cold = 'cold👩‍💻'
  wrapStringWidth(hot)
  wrapStringWidth(cold)

  for (let index = 0; index < 8190; index++) {
    wrapStringWidth(`entry${index}`)
  }

  wrapStringWidth(hot)
  wrapStringWidth('overflow')
  wrapStringWidth(hot)
  wrapStringWidth(cold)

  expect(segment.mock.calls.filter(([text]) => text === hot)).toHaveLength(1)
  expect(segment.mock.calls.filter(([text]) => text === cold)).toHaveLength(2)
  segment.mockRestore()
})

it('bounds retained UTF-16 units and bypasses oversized keys without flushing useful entries', () => {
  const segment = vi.spyOn(Intl.Segmenter.prototype, 'segment')
  const old = 'size-budget-old'
  wrapStringWidth(old)

  for (let index = 0; index < 300; index++) {
    wrapStringWidth(`${index}`.padEnd(1024, '界'))
  }

  wrapStringWidth(old)
  const oversized = '界'.repeat(1025)
  const hot = 'size-budget-hot'
  wrapStringWidth(hot)
  wrapStringWidth(oversized)
  wrapStringWidth(oversized)
  wrapStringWidth(hot)

  expect(segment.mock.calls.filter(([text]) => text === old)).toHaveLength(2)
  expect(segment.mock.calls.filter(([text]) => text === oversized)).toHaveLength(2)
  expect(segment.mock.calls.filter(([text]) => text === hot)).toHaveLength(1)
  segment.mockRestore()
})
