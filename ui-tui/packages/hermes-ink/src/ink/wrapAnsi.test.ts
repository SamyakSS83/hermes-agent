import { afterEach, expect, it, vi } from 'vitest'
import reference from 'wrap-ansi'

import { evictInkCaches } from './cache-eviction.js'
import cases from './wrapAnsi.cases.json'
import { wrapAnsi } from './wrapAnsi.js'

afterEach(() => {
  vi.restoreAllMocks()
  evictInkCaches('all')
})

it('matches upstream UTF-16 output for ANSI, OSC, Unicode and malformed input before and after eviction', () => {
  for (const [input, columns, kind] of cases as [string, number, string][]) {
    const options = { hard: true, trim: false, wordWrap: kind !== 'wrap-char' }
    const expected = reference(input, columns, options)
    expect(wrapAnsi(input, columns, options)).toBe(expected)
    evictInkCaches('half')
    expect(wrapAnsi(input, columns, options)).toBe(expected)
  }

  // Exercise upstream defaults and all combinations, not just renderer options.
  for (const input of ['  é 👩‍💻 hello world  ', '\x1b[31mcolored words\x1b[39m', '\ud800 bad\udfff']) {
    for (const hard of [false, true]) {
      for (const trim of [false, true]) {
        for (const wordWrap of [false, true]) {
          const options = { hard, trim, wordWrap }
          expect(wrapAnsi(input, 5, options)).toBe(reference(input, 5, options))
        }
      }
    }

    expect(wrapAnsi(input, 5)).toBe(reference(input, 5))
  }
})

it('reuses word measurements across different texts and viewport widths', () => {
  const segment = vi.spyOn(Intl.Segmenter.prototype, 'segment')
  const word = 'repeated👩‍💻word'
  const first = wrapAnsi(`${word} first`, 12, { hard: true, trim: false })
  const second = wrapAnsi(`${word} second`, 18, { hard: true, trim: false })
  const measurements = segment.mock.calls.filter(([text]) => text === word).length

  expect(first).toBe(reference(`${word} first`, 12, { hard: true, trim: false }))
  expect(second).toBe(reference(`${word} second`, 18, { hard: true, trim: false }))
  expect(measurements).toBe(1)
})
